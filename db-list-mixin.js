
/**
  * `DbListMixin`
  * 
  *   This mixin provides Firestore integration with `lite-list`.
  *   
  *   It includes automatic pagination and garbage collection for
  *   very large or indeterminate sized lists.
  * 
  * 
  * 
  *
  *  Properites:
  *
  *
  *    
  *     coll - String - Firestore 'coll' collection access string.
  * 
  * 
  *     constraints - Array - Firestore query constraint functions, 
  *                           such as 'where' and 'orderBy'.
  * 
  *     
  *     visible - Boolean - Db subscriptions are only active when true.
  *
  *
  *
  * 
  *  Example:
  * 
  * 
  * 
  *   <lite-list items="[[_listItems]]">
  *
  *     <template is="dom-repeat" 
  *               items="[[_repeaterItems]]"
  *               strip-whitespace>
  *          
  *       <my-list-item data="[[item.data]]"
  *                     slot$="slot-[[index]]">
  *       </my-list-item>
  *
  *     </template>
  *
  *   </lite-list>
  * 
  *
  *
  * @customElement
  * @polymer
  * @demo demo/index.html
  *
  **/


import {clamp} from '@longlost/app-core/lambda.js';

import {
  hijackEvent, 
  listenOnce
} from '@longlost/app-core/utils.js';

import {
  collection,
  endAt,
  initDb,
  limit,
  onSnapshot,
  queryColl,
  startAt
} from '@longlost/app-core/services/services.js';

import '@longlost/app-lists/lite-list.js';


export const DbListMixin = superClass => {

  return class DbListMixin extends superClass {    

    static get properties() {
      return {

        // Firestore coll path string.
        coll: String,

        // Firestore query constraint functions, 
        // such as 'where' and 'orderBy'.
        constraints: {
          type: Array,
          value: () => ([])
        },

        // Optimize db subscription usage.
        // Only run db item subscriptions when the list is visible.
        visible: Boolean,

        // Whether currently fetching from the db or not.
        // Used to limit only one sub at at time to the db.
        _busy: Boolean,

        // Firestore reference.
        _db: Object,

        // Since the list is built dynamically, there is no 
        // way to know the total number of entries in the db
        // ahead of time. 
        //
        // Therefore, assume the end has been reached anytime
        // the number of returned entries decreases relative 
        // to the prior batch.
        _endDetected: Boolean,

        _index: {
          type: Number,
          computed: '__computeIndex(_lag, _pagination.index)'
        },

        // Trail the current topmost row of visible items with the
        // set of live entries, to create a buffer in preparation 
        // for a sudden change in scroll direction.
        //
        // Roughly 1/2 viewport height worth of items to lag by.
        _lag: {
          type: Number,
          computed: '__computeLag(_pagination.direction, _visibleCount)'
        },

        // To be used by implementation to drive 'lite-list'.items property.
        _listItems: Array, // Initializing as undefined is required.

        // From 'lite-list'.
        //
        // Maximum number of entries to fetch per pagination.
        _max: Number,    

        // How many items to fetch for initialization.
        _min: {
          type: Number,
          value: 8
        },

        // From 'lite-list' 'pagination-changed' event.
        _pagination: Object,

        // The latest cached pagination while the db was busy.
        _paginationWaiting: Object,

        // Firebase db ref based on coll
        _ref: {
          type: Object,
          computed: '__computeRef(coll, _db)'
        },

        // To be used by implementation to drive 'lite-list'
        // nested template repeater's .items property.
        _repeaterItems: Array,

        _resolution: {
          type: Number,
          value: 1,
          computed: '__computeResolution(_max, _visibleCount)'
        },

        _resultsCount: {
          type: Number,
          observer: '__resultsCountChanged'
        },

        // Services/Firestore subscription unsubscribe function.
        _unsubscribe: Object,

        _visibleCount: {
          type: Number,
          computed: '__computeVisibleCount(_pagination)'
        },

        // Single use latch to handle 'lite-list' initilization.
        _waitedForMax: Boolean

      };
    }


    static get observers() {
      return [
        '__updateItems(visible, constraints, _ref, _index)'
      ];
    }


    constructor() {

      super();

      this.__currentItemsChangedHandler  = this.__currentItemsChangedHandler.bind(this);
      this.__maxContainersChangedHandler = this.__maxContainersChangedHandler.bind(this);
      this.__paginationChangedHandler    = this.__paginationChangedHandler.bind(this);

      this.addEventListener('lite-list-current-items-changed',  this.__currentItemsChangedHandler);
      this.addEventListener('lite-list-max-containers-changed', this.__maxContainersChangedHandler);
      this.addEventListener('lite-list-pagination-changed',     this.__paginationChangedHandler);
    }


    async connectedCallback() {

      super.connectedCallback();

      this._db = await initDb();
    }


    disconnectedCallback() {

      super.disconnectedCallback();

      this.removeEventListener('lite-list-current-items-changed',  this.__currentItemsChangedHandler);
      this.removeEventListener('lite-list-max-containers-changed', this.__maxContainersChangedHandler);
      this.removeEventListener('lite-list-pagination-changed',     this.__paginationChangedHandler);

      this.__unsub();
    }


    __computeData(polymerObj) {

      const items = polymerObj?.base;

      if (!Array.isArray(items)) { return; }

      return items.reduce((accum, item) => {

        if (!item) { return accum; } // Items may be GC'd.

        accum[item.data.uid] = item.data;

        return accum;
      }, {});
    }


    __computeIndex(lag, index) {

      if (typeof lag !== 'number' || typeof index !== 'number') { return; }

      return Math.max(0, index + lag);
    }

    
    __computeLag(direction = 'forward', count = 0) {

      const scalar = Math.ceil(count / 2);

      // Lag opposes current scroll direction.
      //
      // Lag in 'reverse' includes an offset 
      // of visible items count.
      return direction === 'forward' ? scalar * -1 : scalar + count;
    }


    __computeRef(coll, db) {

      if (!coll || !db) { return; }

      // Will need to create an index in Firestore.
      return collection(db, coll);
    }

    // Represents the number of times the current db subscription
    // is shifted as the user scrolls, relative to the maximum
    // number of DOM elements.
    __computeResolution(max = 1, visible = 1) {

      return Math.ceil((2 * max) / visible);
    }


    __computeVisibleCount(pagination) {

      if (!pagination) { return 1; }

      const {itemBbox, parentBbox, per} = pagination;

      const visibleRows = Math.ceil(parentBbox.height / itemBbox.height);

      return visibleRows * per;
    }


    __resultsCountChanged(newCount, oldCount) {

      if (newCount < oldCount && this._pagination?.direction === 'forward') {

        this._endDetected = true;
      }
      else {

        this._endDetected = false;
      }
    }

    // Attempt to free up memory of very large lists.
    //
    // Set unneeded photo db objects to undefined to 
    // release their references and promote true GC.
    //
    // Deemed ready for manual GC when items are very 
    // far off screen, relative to the viewport.
    //
    // The max amount of data items left in the array is
    // this._max * 3. That is, the current set of items
    // that are being subscribed to (1 max total), and 
    // one set of stale items before (1 max), and one 
    // set after (1 max), the current visible/live set.
    __garbageCollect(index, direction) {

      if (
        typeof index !== 'number' ||
        !this._pagination         || 
        this._max <= this._min
      ) { return; }

      const garbageIndex = direction === 'forward' ?
                             index - this._max :
                             index + this._max;

      const totalGarbage = direction === 'forward' ? 
                             garbageIndex : 
                             this._listItems.length - garbageIndex;

      // Only GC between 0 and this._max items at a time.
      const count = clamp(0, this._max, totalGarbage);
      const clear = Array(count).fill(undefined);

      // Do not force and update with 'this.splice()', as these
      // changes do NOT need to be reflected the DOM.
      this._listItems.splice(garbageIndex, clear.length, ...clear);
    }


    __getQueryConstraints(constraints, index, direction) {
      
      if (index > 0) {

        const {doc} = this._listItems.at(index);

        if (direction === 'reverse') {
          constraints.push(endAt(doc));
        }
        else {
          constraints.push(startAt(doc));
        }
      }

      constraints.push(limit(Math.max(this._min, this._max)));

      return constraints;
    }


    // Start a subscription to file data changes.
    __updateItems(visible, constraints, ref, index) {

      if (
        !constraints?.length ||
        !ref                 ||
        (index > 0 && !this._listItems.at(index)) // Validate index is in range.
      ) { return; } 
      
      // Cancel previous subscription.
      this.__unsub();

      // Don't start a new subscription if not in use or not visible.
      if (!visible) { return; }

      this._busy = true;

      // Cache this value to guarantee it's accurate for 
      // this particular set of results.
      const direction = this._pagination?.direction;

      this.__garbageCollect(index, direction);


      const callback = results => {

        // Check for any late returning results that are from prior subs.
        if (this._busy && index !== this._index) { return; }

        // Filter out orphaned data that may have been caused
        // by deletions prior to cloud processing completion.
        const validResults = results.filter(obj => obj.data.uid);
        this._resultsCount = validResults.length; // Used to detect the end of db entries.

        // Add/replace current range of results into the main '_listItems' array.
        if (Array.isArray(this._listItems)) {

          // Reverse pagination uses 'endAt' db function to fetch
          // items that come before the current index.
          const start = direction === 'reverse' ?
                          // One less than the total results since we use the inclusive
                          // 'endAt' constraint function. So shift back enough for
                          // the last result to replace the item at index.
                          index - (validResults.length - 1) :
                          index;
          
          this.splice('_listItems', start, validResults.length, ...validResults);
        }
        else { // Initialization.

          this.set('_listItems', validResults);
        }

        this._busy = false;

        if (this._paginationWaiting) {

          this._pagination        = this._paginationWaiting;
          this._paginationWaiting = undefined;
        }
      };

      const errorCallback = error => {

        if (
          error.message && 
          error.message.includes('document does not exist')
        ) { return; }
        
        this._listItems = undefined;

        console.error(error);
      };


      const qConstraints = this.__getQueryConstraints([...constraints], index, direction);
      const q            = queryColl(ref, ...qConstraints);

      this._unsubscribe = onSnapshot(q, snapshot => {

        if (snapshot.exists || ('empty' in snapshot && snapshot.empty === false)) {

          window.requestAnimationFrame(() => {

            const results = [];

            // Snapshots are not true arrays. So make one.
            snapshot.forEach(doc => results.push({data: doc.data(), doc}));

            callback(results);
          });
        } 
        else {
          errorCallback({message: 'document does not exist'});
        }
      }, errorCallback);
    }


    __unsub() {

      if (this._unsubscribe) {

        this._unsubscribe();
        this._unsubscribe = undefined;
      }
    }

    // Output from 'lite-list', used to sync
    // the local repeater of slotted items.
    __currentItemsChangedHandler(event) {

      hijackEvent(event);

      this._repeaterItems = event.detail.value;
    }


    __maxContainersChangedHandler(event) {

      // NOTE! Cannot hijack this event, it's also 
      // used by '__paginationChangedHandler'.

      this._max = event.detail.value;
    }


    async __paginationChangedHandler(event) {

      hijackEvent(event);

      const pagination     = event.detail.value;
      const {count, index} = pagination;

      // At the end of the camera roll. Done paginating.
      if (this._endDetected && index >= this._pagination.index) { return; }

      // Do not hit the db at each change.
      //
      // The resolution of this event is 1 fired for each row
      // of photos that passes the top of the viewport.
      const remainder = index % this._resolution;

      // Skip this tick.
      if (remainder !== 0) { return; }

      // Must wait for the next update to 'max' before
      // triggering a new db subscription.
      if (count <= this._min && index === 0 && !this._waitedForMax) {

        this._waitedForMax = true;
        
        await listenOnce(this, 'lite-list-max-containers-changed');
      }

      if (this._busy) {

        this._paginationWaiting = pagination;
      }
      else {

        this._pagination = pagination;
      }
    }    

  };
};
