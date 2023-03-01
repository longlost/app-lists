
/**
  * `DbListMixin`
  * 
  *   This mixin provides Firestore integration with `lite-list`.
  *   
  *   It includes automatic pagination and "garbage collection" for
  *   very large lists or lists that may grow to an indeterminate size.
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
  *                           ie. [where('a', '==', 'b'), orderBy('x', 'asc')]
  * 
  * 
  *     reverseConstraints - Array - Firestore query constraint functions, 
  *                                  such as 'where' and 'orderBy',
  *                                  ordered in the opposite direction.
  *                                  Used for paginating when scrolling
  *                                  in reverse.
  *                                  ie. [where('a', '==', 'b'), orderBy('x', 'desc')]
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

import {schedule} from '@longlost/app-core/utils.js';

import {
  collection,
  initDb,
  limit,
  onSnapshot,
  queryColl,
  startAt
} from '@longlost/app-core/services/services.js';

import '@longlost/app-lists/lite-list.js';


const getQueryConstraints = ({
  batchSize, 
  constraints, 
  direction, 
  doc, 
  index,
  reverseConstraints
}) => {

  const notAtStart = index > 0;
  
  // Do not mutate original input array.
  const qConstraints = direction === 'reverse' && notAtStart ? 
                         [...reverseConstraints] : 
                         [...constraints]; 

  if (notAtStart) {

    qConstraints.push(startAt(doc));
  }

  qConstraints.push(limit(batchSize));

  return qConstraints;
};


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

        layout: {
          type: String,
          value: 'vertical' // Or 'horizontal'.
        },

        // Firestore query constraint functions, 
        // such as 'where' and 'orderBy'.
        //
        // Used when scrolling in the 'reverse'
        // direction. These should return 
        // results in the reverse ordering from 
        // 'constrains'.
        //
        // This is due to the fact that 'endAt'
        // is not symmetrical to 'startAt'. 
        //
        // 'endAt' is not respected when used 
        // with 'limit'. The returned results 
        // start at the beginning of the 
        // collection, according to 'orderBy'.
        reverseConstraints: {
          type: Array,
          value: () => ([])
        },

        // Optimize db subscription usage.
        // Only run db item subscriptions when the list is visible.
        visible: Boolean,

        // Determines how many results to fetch from db for each page.
        _batchSize: {
          type: Number,
          computed: '__computeBatchSize(_min, _max)'
        },

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
        // Maximum number of containers to be stamped.
        _max: Number, 

        // How many items to fetch for initialization.
        _min: {
          type: Number,
          value: 20,
          readOnly: true
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

        // Used to filter pagination events to reduce unneeded
        // hits to the database.
        _resolution: {
          type: Number,
          value: 1,
          computed: '__computeResolution(_batchSize)'
        },

        _resultsCount: {
          type: Number,
          observer: '__resultsCountChanged'
        },

        // Services/Firestore subscription unsubscribe function.
        _unsubscribe: Object,

        _visibleCount: {
          type: Number,
          computed: '__computeVisibleCount(layout, _pagination)'
        }

      };
    }


    static get observers() {
      return [
        '__updateItems(visible, constraints, reverseConstraints, _ref, _batchSize, _index)'
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


    __computeBatchSize(min, max = 1) {

      return Math.max(min, max);
    }


    __computeData(polymerObj) {

      const items = polymerObj?.base;

      if (!Array.isArray(items)) { return; }

      return items.reduce((accum, item) => {

        const uid = item?.data?.uid;

        // Items may be GC'd, so check for 
        // items with data from the db.
        if (uid) { 
          accum[item.data.uid] = item.data; 
        }        

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
    // is shifted as the user scrolls, relative to the batch size.
    __computeResolution(batchSize = 1) {

      // Paginate near the middle of the batch.
      return Math.ceil(batchSize / 2); 
    }


    __computeVisibleCount(layout, pagination) {

      if (!pagination) { return 1; }

      const {itemBbox, parentBbox, per} = pagination;

      const dim      = layout === 'vertical' ? 'height' : 'width';
      const sections = Math.ceil(parentBbox[dim] / itemBbox[dim]);

      return sections * per;
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
    // this._batchSize * 3. 
    //
    // That is, the current set of items that are being 
    // subscribed to (1 batch size), and one set of 
    // stale items before (1 size), and one set after 
    // (1 size), the current visible/live set.
    __garbageCollect(index, direction, batchSize) {

      if (
        typeof index !== 'number' ||
        !this._pagination         || 
        batchSize <= this._min
      ) { 
        return; 
      }

      const distance     = batchSize * 2;
      const garbageIndex = direction === 'forward' ?
                             index - distance :
                             index + distance;

      const totalGarbage = direction === 'forward' ? 
                             garbageIndex : 
                             this._listItems.length - garbageIndex;

      // Only GC between 0 and batchSize items at a time.
      const count = clamp(0, batchSize, totalGarbage);
      const clear = Array(count).fill(undefined);
      const start = direction === 'forward' ? 
                      garbageIndex - count : 
                      garbageIndex;

      if (
        start < 0                              || // Before beginning of array.
        start + count > this._listItems.length || // After end of array.
        count === 0                               // No items to remove. Bail.
      ) { 
        return; 
      }

      // Do not force and update with 'this.splice()', as these
      // changes do NOT need to be reflected the DOM immediately.
      // Changes can be picked up the next time the repeater updates.
      this._listItems.splice(start, count, ...clear);
    }

    // Start a subscription to file data changes.
    __updateItems(visible, constraints, reverseConstraints, ref, batchSize, index) {

      const doc = this._listItems?.at(index)?.doc;

      if (
        !constraints?.length        ||
        !reverseConstraints?.length ||
        !ref                        ||
        !batchSize                  ||
        (index > 0 && !doc) // Validate index is in range.
      ) { 
        return; 
      } 

      // Cancel previous subscription.
      this.__unsub();

      // Don't start a new subscription if not in use or not visible.
      if (!visible) { return; }

      this._busy = true;

      // Cache this value to guarantee it's accurate for 
      // this particular set of results.
      const direction = this._pagination?.direction || 'forward';

      this.__garbageCollect(index, direction, batchSize);


      const callback = raw => {

        // Check for any late returning results that are from prior subs.
        if (index !== this._index) { return; }

        // Filter out orphaned data that may have been caused
        // by deletions prior to cloud processing completion.
        const validResults = raw.filter(obj => obj.data.uid);
        const results      = direction === 'reverse' ? 
                               validResults.reverse() :
                               validResults;
        const count        = results.length;
        this._resultsCount = count; // Used to detect the end of db entries.

        // Add/replace current range of results into the main '_listItems' array.
        if (Array.isArray(this._listItems)) {

          const lastIndex = count - 1;

          // Reverse pagination returns items that come before the current index.
          const start = direction === 'reverse' ?
          
                          // One less than the total results since we use the inclusive
                          // 'startAt' constraint function. So shift back enough for
                          // the last result to replace the item at index.
                          Math.max(0, index - lastIndex):
                          index || 0;
          
          this.splice('_listItems', start, count, ...results);
        }
        else { // Initialization.

          this.set('_listItems', results);
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
        ) { 
          return; 
        }
        
        this._listItems = undefined;

        console.error(error);
      };

      const qConstraints = getQueryConstraints({
        batchSize, 
        constraints, 
        direction, 
        doc, 
        index,
        reverseConstraints
      });

      const q = queryColl(ref, ...qConstraints);

      this._unsubscribe = onSnapshot(q, async snapshot => {

        if (snapshot.exists || ('empty' in snapshot && snapshot.empty === false)) {

          const results = [];

          // Snapshots are not true arrays. So make one.
          snapshot.forEach(d => results.push({data: d.data(), doc: d}));

          await schedule(); // Smooths jank.

          callback(results);
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

      this._repeaterItems = event.detail.value;
    }


    __maxContainersChangedHandler(event) {

      // NOTE! Cannot hijack this event, it's also 
      // used by '__paginationChangedHandler'.

      this._max = event.detail.value;
    }
    

    __paginationChangedHandler(event) {

      const pagination = event.detail.value;
      const {count, direction, index, per} = pagination;

      // At the end of the camera roll. Done paginating.
      if (this._endDetected && index >= this._pagination?.index) {
        return;
      }

      // Don't paginate when returning to zero. The last
      // pagination in 'reverse' already covers this 'window'.
      if (
        direction                   === 'reverse' && // Current.
        this._pagination?.direction === 'reverse' && // Previous.
        index === 0
      ) { 
        return; 
      }

      // Do not hit the db at each change.
      //
      // The resolution of this event is 1 fired for each
      // section of items that passes the top/left of the 
      // viewport. So compare this with our desired resolution.
      //
      // This effectively defines when to move the 'window'
      // of 'live' items.
      const remainder         = index % this._resolution;
      const pageIsThisSection = remainder >= per;

      // Invalid initialization state.
      if (this._pagination?.index === 0 && this._pagination?.count > count) {
        return; 
      }

      // Not initialization (index === 0).
      // Not this section.
      // Skip this tick.
      if (
        this._pagination?.index !== 0 &&
        remainder !== 0 && 
        pageIsThisSection
      ) { 
        return;  
      }

      if (this._busy) {

        this._paginationWaiting = pagination;
      }
      else {

        this._pagination = pagination;
      }
    }


    __findScrollerMoveTo() {

      const carousel = this.select('lite-carousel');

      if (carousel) {

        return carousel.moveToSection.bind(carousel);
      }

      const list = this.select('lite-list');

      return list.moveToIndex.bind(list);
    }

    // The main difficulty comes when making
    // jumps to indexes that are far from the
    // current position.
    //
    // This is a special case because Firebase 
    // requires an existing document to reference 
    // as a starting point in a paged query.
    //
    // If we are moving to a position where 
    // previous documents are not available from 
    // prior paginations, we need to provide the 
    // reference doc.
    //
    // Prime '_listItems' in such a way as to 
    // allow for large 'jumps'.
    //
    // First, fill in the missing ref doc, if needed.
    //
    // Then, move to the desired item index.
    moveTo(index, tempIndex, tempItems) {

      if (typeof tempIndex === 'number' && Array.isArray(tempItems)) {

        const start = index - tempIndex;

        // Prepare for 'doc' reference reads which are used for pagination.
        this.splice('_listItems', start, tempItems.length, ...tempItems);
      }

      const moveTo = this.__findScrollerMoveTo();

      return moveTo(index);
    }   

  };
};
