
/**
  * `lite-list`
  * 
  *   This element displays list items in a high performance scroller.
  *   
  *   The list items are recycled so that the number of DOM elements remains low,
  *   even for very large lists.
  *
  *
  *   NOTE: Currently, it is REQUIRED that all elements have identical dimensions.
  *
  *
  *  Example Usage:
  *
  *
  *   my-polymer-elements/pup-list.js
  *
  *   ```
  *     import '@longlost/app-lists/lite-list.js';
  *
  *   ...
  *
  *     static get properties() {
  *       return {
  *
  *         // Master list input collection.
  *         items: {
  *           type: Array,
  *           value: [
  *             {name: 'Spirit'},
  *             {name: 'Bub'},
  *             {name: 'Hunter'},
  *             {name: 'Bandit'},
  *             {name: 'Molly'},
  *             {name: 'Bear'},
  *             {name: 'Lady'},
  *             {name: 'Dunny'},
  *             {name: 'Red'},
  *             {name: 'Cindy'},
  *             {name: 'Suzie'},
  *             {name: 'Mia'},
  *             {name: 'Rex'},
  *             {name: 'Mercedes'},
  *             {name: 'Oscar'},
  *             {name: 'Fancy'},
  *             {name: 'Rover'},
  *             {name: 'Wendy'},
  *             {name: 'Spot'},
  *             {name: 'Buddy'},
  *             {name: 'Fido'},
  *             {name: 'Puddles'},
  *             {name: 'Woofie'},
  *             {name: 'Snickers'}
  *           ]
  *         },
  *
  *         // Drives implementation's <template is="dom-repeat">
  *         _items: Array
  *
  *       };
  *     }
  *
  *     // Required.
  *     __itemsChangedHandler(event) {
  *       this._items = event.detail.value;
  *     }
  *  
  *   ```
  *
  *   my-polymer-elements/pup-list.html
  *
  *   ```
  *
  *     <style>
  * 
  *       lite-list {
  *         grid-auto-rows: 150px; <-- Force identical sized children.
  *       }
  *
  *       .item {
  *         padding:          16px;
  *         border-bottom:    2px solid lightgray;
  *         background-color: white;
  *         color:            black;
  *       }
  *
  *     </style>
  *
  *  
  *     <lite-list infinite
  *                    items="[[items]]"
  *                    on-lite-list-current-items-changed="__itemsChangedHandler">
  *
  *       <template is="dom-repeat" 
  *                 items="[[_items]]">
  *
  *         <div class="item" 
  *              slot$="slot-[[index]]"> <!-- This attribute is required! -->
  *           <h2>[[item.name]]</h2>
  *           <p>Recycled item [[index]]</p>
  *         </div>
  *
  *       </template>
  *
  *     </lite-list>
  *
  *   ```
  *
  *
  *
  *  Properties:
  *
  *
  *
  *   infinite - Optional, Boolean, Default: undefined
  *
  *     Will start back at beginning of 'items' when scrolled past the last
  *     item in the list when 'infinite' is set.
  *   
  *
  *
  *   items - Required, Array, Default: undefined
  *
  *     The collection used to 'hydrate' each repeated element.
  *      
  *     Indirectly drives repeater.
  *      
  *     Only a subset of the items is used at a time, 
  *     dependent on scroll position.
  *    
  *
  *
  *   layout - Optional, String, Default: 'vertical', Valid values: 'vertical', 'horizontal'
  *      
  *     Determines whether the list should scroll vertically or horizontally.
  *
  *
  *    
  *   margin - Optional, Number, Default: 4
  *    
  *     The size of `lite-list` is multiplied by
  *     this number when stamping reusable containers. 
  *      
  *     The new value is used to calculate how many 
  *     reusable items will be created, based off how many
  *     containers will fit inside a virtual container of this size.
  *      
  *     A larger number will result in more offscreen containers,
  *     so there is a tradeoff between scrolling performance and
  *     memory/computational load.
  *      
  *     When tuning rendering performance, this number should scale 
  *     in proportion to the size of individual repeated containers.
  *      
  *     Increase this number for containers that take up a 
  *     large portion of the viewport.
  *      
  *     The lower bounds of this number is clamped at 1.5.
  *    
  *
  *
  *
  *  Events:
  *
  *
  *   'lite-list-current-items-changed', {value: items}
  *
  *     Detail value is an array which is a subset of the provided 'items' array. 
  *     This array MUST drive the external template repeater, to keep items 
  *     synchronized with their recycled containers.
  *
  *
  * 
  *   'lite-list-pagination-changed', {value: {count, direction, index, itemBbox, parentBbox, per}} 
  *
  *     Detail value is an object that contains information 
  *     about the list state that is useful for paginating results.
  *     'index' represents the current topmost/leftmost visible item.
  *     'count' is only a hint to the developer.
  *
  *
  *
  *   'lite-list-item-bbox-changed', {value: DOMRect} 
  *
  *     Detail value is a DOMRect object from the initial instance of a slotted child. 
  *     This info is used internally to determine how many recycleable elements to stamp out.
  *  
  *
  *
  *   @customElement
  *   @polymer
  *   @demo demo/index.html
  *
  *
  **/


import {AppElement} from '@longlost/app-core/app-element.js';

import {DomObserversMixin} from './dom-observers-mixin.js';

import {
  compose,
  head,
  split,
  tail
} from '@longlost/app-core/lambda.js';

import {
  consumeEvent,
  schedule
} from '@longlost/app-core/utils.js';

import template from './lite-list.html';


// Return the leftmost position of a child 
// element with respect to its parent.
const getOffset = (hostSize, sampleSize, position = 'start') => {

  switch (position) {

    case 'start':
      return 0;

    case 'center':

      const hostCenter   = hostSize   / 2;
      const sampleCenter = sampleSize / 2;

      return hostCenter - sampleCenter;

    case 'end':
      return hostSize - sampleSize;
  } 
};

// Hidden items that are above the scroller can be moved down.
// Hidden items that are still below the fold need to stay where they are.
const filterAvailable = ({direction, hidden, layout, visible}) => {

  const reference      = direction === 'forward'  ? head(visible) : tail(visible);
  const refDim         = layout    === 'vertical' ? 'top'         : 'left';
  const entryDim       = layout    === 'vertical' ? 'bottom'      : 'right';
  const refMeasurement = reference.boundingClientRect[refDim];

  if (direction === 'forward') {

    return hidden.filter(entry => entry.boundingClientRect[entryDim] <= refMeasurement);
  }

  return hidden.filter(entry => entry.boundingClientRect[entryDim] >= refMeasurement);
};


class LiteList extends DomObserversMixin(AppElement) {

  static get is() { return 'lite-list'; }

  static get template() { return template; }


  static get properties() {
    return {

      // Will start back at beginning of 'items' when scrolled past the last
      // item in the list when 'infinite' is set.
      infinite: Boolean,

      // An intermediate value that is used soley for the 
      // purpose of leveraging the class value's 'observer'.
      _allHidden: {
        type: Array,
        observer: '__allHiddenChanged'
      },

      _containerIndex: {
        type: Number,
        computed: '__computeContainerIndex(_containerCount, _virtualIndex)'
      },

      // Drives the `template` repeater.
      _containerItems: {
        type: Array,
        computed: '__computeContainerItems(_containerCount)'
      },

      // A subset of provided 'items' that represents the currently
      // visible set of virtual elements. This is a slice of the 
      // 'items' array, used by parent implementing 'lite-list',
      // to keep its mirrored template repeater items in sync with 
      // the one used in this element's Shadow DOM.
      _currentItems: Array,

      _data: {
        type: Array,
        computed: '__computeData(infinite, items, _containerCount, _start)'
      },

      // The current scroll direction.
      _direction: {
        type: String,
        value: 'forward' // Or 'reverse'.
      },

      // This value reflects only changes made due to 
      // items coming into view vs. going out of view.
      _incomingHidden: Array,

      _maxSize: {
        type: Number,
        computed: '__computeMaxSize(infinite, items.length, _containersPer, _sampleSize)'
      },

      // This current scrolled distance of the host element or window.
      _scroll: {
        type: Number,
        observer: '__scrollChanged'
      },

      _sections: {
        type: Number,
        computed: '__computeSections(_containerCount, _containersPer)'
      },

      _skipUpdate: Boolean,

      _sorted: {
        type: Array,
        computed: '__computeSorted(_containers, _incomingHidden, _side)'
      },

      _start: {
        type: Number,
        value: 0,
        computed: '__computeStart(infinite, items.length, _virtualStart)'
      },

      _stopRecycling: {
        type: Boolean,
        computed: '__computeStopRecycling(infinite, items.length, _containerCount, _virtualStart)'
      },

      _translate: {
        type: String,
        value: 'translateY', // or 'translateX'
        computed: '__computeTranslate(layout)'
      },

      _travel: {
        type: Number,
        computed: '__computeTravel(_sampleSize, _sections)'
      },

      _virtualIndex: {
        type: Number,
        value: 0,
        computed: '__computeVirtualIndex(layout, _sampleBbox, _containersPer, _scroll)'
      },

      _virtualStart: {
        type: Number,
        value: 0
      }

    };
  }


  static get observers() {
    return [
      '__currentItemsChanged(_currentItems)',
      '__hostSizeChanged(_hostSize)',
      '__layoutChanged(layout)',
      '__maxCountChanged(_maxContainerCount)',
      '__moveAvailableContainers(_sorted)',
      '__rootMarginChanged(_rootMargin)',
      '__sampleBboxChanged(_sampleBbox)',
      '__updateAllHidden(_hidden)',

      // '_containers' only used as a synchronization trigger.
      '__updateCurrentItems(_data, _containers)',
      '__updatePagination(_virtualIndex, _containerCount)',
      '__updateVirtualStart(_sorted)'
    ];
  }


  constructor() {

    super();

    this.__hostScrollHandler   = this.__hostScrollHandler.bind(this);
    this.__windowScrollHandler = this.__windowScrollHandler.bind(this);
  }


  disconnectedCallback() {

    super.disconnectedCallback();

    window.removeEventListener('scroll', this.__windowScrollHandler);
    this.removeEventListener(  'scroll', this.__hostScrollHandler);
  }


  __computeContainerIndex(count, virtualIndex) {

    if (!count || !virtualIndex) { return 0; }

    return virtualIndex % count;
  }


  __computeContainerItems(count) {

    if (typeof count !== 'number') { return; }

    return Array(count).fill(undefined);
  }


  __computeData(infinite, items, count, start) {

    if (!items || typeof start !== 'number') { return; }

    const end    = start + count;
    const length = items.length;

    if (infinite && end > length) {

      const delta = end - length;

      const beginning = items.slice(start);
      const ending    = items.slice(0, delta);

      return [...beginning, ...ending];
    }

    return items.slice(start, end);
  }

  // undefined return values to be ignored.
  __computeMaxSize(infinite, length, per, size) {

    if (infinite || !length || !per || !size) { return; }

    return size * Math.ceil(length / per);
  }


  __computeSections(count, per) {

    if (!count || !per) { return; }

    return Math.ceil(count / per);
  }

  // Get live position measurements and create a 
  // collection that is similar to IntersectionObserverEntry 
  // to simplify the api, then sort by position.
  __computeSorted(containers, hidden, side) {

    if (!containers || !hidden || !side) { return; }

    return containers.
             map(container => ({
               boundingClientRect: container.getBoundingClientRect(),
               target:             container
             })).
             sort((a, b) => // Sort ascending.
               a.boundingClientRect[side] - b.boundingClientRect[side]);
  }


  __computeStart(infinite, length, virtualStart) {

    if (!length) { return 0; }

    // Number of iteration cycles over 'items'.
    const multiple = Math.floor(virtualStart / length);

    if (multiple && !infinite) {
      return length;
    }

    return virtualStart - (length * multiple);
  }


  __computeStopRecycling(infinite, length, count, virtualStart) {

    if (infinite || !length || !count) { return false; }

    const last = length - 1;

    return virtualStart + count > last;
  }


  __computeTranslate(layout) {

    return layout === 'vertical' ? 'translateY' : 'translateX';
  }


  __computeTravel(size, sections) {

    if (!size || !sections) { return; }

    return size * sections;
  }


  __computeVirtualIndex(layout, sampleBbox, per, scroll) {

    if (
      !layout     || 
      !sampleBbox || 
      !per        || 
      typeof scroll !== 'number'
    ) { 
      return 0; 
    }

    const {height, left, top, width} = sampleBbox;

    if (!height || !width) { return 0; }

    const beginning = layout === 'vertical' ? top    : left;
    const size      = layout === 'vertical' ? height : width;
    const section   = Math.floor(Math.abs((scroll - beginning) / size));

    return section * per;
  }

  // This is used to filter incoming vs outgoing
  // scroll possition changes.
  //
  // Any dropped frames are more egregious when
  // the user begins her scroll away from an item
  // versus when the item is coming to rest after
  // a scroll operation.
  //
  // This is especially useful in use cases where
  // scroll snapping is utilized, ie 'lite-carousel'.
  __allHiddenChanged(newVal, oldVal) {

    if (oldVal?.length > newVal?.length) { return; }

    this._incomingHidden = newVal;
  }


  __currentItemsChanged(items) {

    if (!items) { return; }

    this.fire('lite-list-current-items-changed', {value: items});
  }

  // Screen resizes or orientation changes.
  __hostSizeChanged(size) {

    if (size && this._containers?.length) {

      this.__reposition();
    }
  }


  __layoutChanged(layout) {

    if (!layout) { return; }

    if (layout === 'vertical') {
      this.removeEventListener('scroll', this.__hostScrollHandler);
      window.addEventListener( 'scroll', this.__windowScrollHandler);
    }
    else {
      window.removeEventListener('scroll', this.__windowScrollHandler);
      this.addEventListener(     'scroll', this.__hostScrollHandler);
    }
  }

  // NOTE:
  //
  //    Use caution when consuming this event, as it fires
  //    repeatedly any time the host is resized.
  __maxCountChanged(max) {

    this.fire('lite-list-max-containers-changed', {value: max});
  }

  __rootMarginChanged(rootMargin) {

    this.fire('lite-list-root-margin-changed', {value: rootMargin});
  }


  __move(container, position) {

    container.previous           = position; // Cache for next move.
    container.style['transform'] = `${this._translate}(${position}px)`;
  }


  __getMarginNum() {

    const getNum = compose(split('%'), head, split('px'), head);

    const str = this.layout === 'vertical' ? this._marginTop : this._marginLeft;
    const num = Number(getNum(str));

    const isPercent = str.includes('%');

    if (isPercent) {

      return Math.round(this._hostSize * (num / 100));
    }

    return num;
  }

  // Correct the position of containers when some have been removed or added.
  // This commonly occurs after screen rotation or resize changes.
  //
  // Also used to correct for programmic scrolling by 'moveToIndex' public method.
  async __reposition() {

    await schedule();

    if (typeof this._containerIndex !== 'number' || !this._virtualIndex) { return; }

    // Placement of the containers should be 
    // deterministic from the dev's point of view.
    //
    // To that end, we must calculate the position 
    // of each container with the same parameters
    // as IntersectionObserver, namely 'rootMargin'.
    const offset        = getOffset(this._hostSize, this._sampleSize, this.position);
    const sectionIndex  = this._virtualIndex / this._containersPer;
    const distance      = Math.max(0, sectionIndex - 1) * this._sampleSize;
    const indexPosition = distance + offset;

    // One whole jump from a starting position to the next placement.
    const jump             = (this._containerCount / this._containersPer) * this._sampleSize;
    const currentShift     = Math.floor(sectionIndex / this._containerCount);
    const currentShiftSize = currentShift     * jump;
    const shiftForward     = currentShiftSize + jump;
    const shiftBack        = currentShiftSize - jump;
    const margin           = this.__getMarginNum();

    const startPosition = this._direction === 'forward' ?
                            indexPosition - margin :
                            shiftForward  + margin;

    const getPosition = placement => {

      // Check if the container would be available to be shifted forward.
      // In this case, if it is placed before the viewport edge + rootMargin.
      if (!this.infinite && placement < startPosition && shiftForward < this._maxSize) {

        return shiftForward;
      }

      if (!this.infinite && placement >= this._maxSize && shiftBack >= 0) {

        return shiftBack;
      }

      if (indexPosition >= jump) {

        return currentShiftSize;
      }
    };

    this._sorted.forEach(entry => {

      const {boundingClientRect, target} = entry;

      const previous = target.previous || 0;
      const travel   = currentShiftSize - previous;

      // Calculate the future position. 
      const placement = boundingClientRect[this._side] + travel + this._scroll;
      const position  = getPosition(placement);

      if (position) {

        this.__move(target, position);
      }
    });

    // Force a new set of calculations that place 
    // the data items in the proper containers.
    const temp = this._entries;

    this._entries = undefined;
    this._entries = temp;
  }


  __forward(grouped) {

    const available = filterAvailable({
                        ...grouped,
                        direction: 'forward',
                        layout:     this.layout
                      });

    if (!available.length) { return; }

    const getNewPlacement = side => side + this._scroll + this._travel;

    const {length} = this.items;

    const movables = this.infinite ? available : available.filter(entry => {

      const {boundingClientRect, target} = entry;
      const {height, left, top, width}   = boundingClientRect;

      // 'top'/'left' are relative to the viewport, so can be a negative values.
      const scrollSide = this.layout === 'vertical' ? top    : left;
      const scrollDim  = this.layout === 'vertical' ? height : width;
      const perSide    = this.layout === 'vertical' ? left   : top;
      const perDim     = this.layout === 'vertical' ? width  : height;

      // Calculate the future position. 
      const placement   = getNewPlacement(scrollSide);
      const scrollIndex = Math.floor(placement / scrollDim) * this._containersPer;
      const perIndex    = Math.floor(perSide   / perDim);
      const index       = scrollIndex + perIndex;

      return index < length;
    });

    movables.forEach(entry => {

      const {boundingClientRect, target} = entry;

      // Calculate the future position. 
      //   
      // 'top'/'left' are relative to the viewport, so can be a negative values.
      const placement = getNewPlacement(boundingClientRect[this._side]);
      const previous  = target.previous || 0;
      const position  = previous + this._travel;

      this.__move(target, position);
    });
  }


  __reverse(grouped) {

    const available = filterAvailable({
                        ...grouped,
                        direction: 'reverse', 
                        layout:     this.layout
                      });

    if (!available.length) { return; }

    available.forEach(entry => {

      const {target} = entry;
      const previous = target.previous || 0;

      if (previous === 0) { return; }

      const position = previous - this._travel;

      if (position < 0) { return; }

      this.__move(target, position);
    });
  };
  

  async __moveAvailableContainers(sorted) {

    if (
      !this._direction ||
      !sorted          || 
      !sorted.length   || 
      !this._hidden    || 
      !this._hidden.length
    ) { 
      return; 
    }

    // Check if done recycling containers.
    if (this._stopRecycling && this._direction === 'forward') { return; }

    // This rare state happens when IntersectionObserver hasn't 
    // updated the state of all containers yet, 
    // and so is an erroneous state that must be ignored.
    if (this._hidden.length === sorted.length) { return; }

    const grouped = sorted.reduce((accum, entry) => {

      const match = this._hidden.find(obj => 
                      obj.target === entry.target);

      if (match) {
        accum.hidden.push(entry);
      }
      else {
        accum.visible.push(entry);
      }

      return accum;

    }, {hidden: [], visible: []});

    // An erroneous state, where there are no 
    // visible elements, that must be ignored.
    if (grouped.visible.length === 0) { return; }

    if (this._direction === 'forward') {
      this.__forward(grouped);
    }
    else {
      this.__reverse(grouped);
    }
  }


  __sampleBboxChanged(bbox) {

    this.fire('lite-list-item-bbox-changed', {value: bbox});
  }


  __scrollChanged(newVal = 0, oldVal = 0) {

    // This corrects an issue caused by programmic scrolling 
    // to top which misplaces containers due to IntersecionObserver
    // lagging behind the speed of scrolling up. 
    // 
    // This is especially problematic when the list has been scrolled
    // down quite a bit, resulting in a high scroll velocity.
    //
    // Programmic scrolling includes built-in scroll to top functionality 
    // on Apple touch devices (when top of ui chrome is tapped), as
    // well as calls to window.scrollTo(0).
    if (newVal === 0 && oldVal > 0 && this._containers) {

      this._containers.forEach(el => {
        el.previous           = 0;
        el.style['transform'] = 'none';
      });
    }

    this._direction = newVal > oldVal ? 'forward' : 'reverse';
  }

  // '_allHidden' is an intermediate value that is
  // used soley for the purpose of leveraging the
  // class value's 'observer'.
  __updateAllHidden(hidden) {

    this._allHidden = hidden;
  }

  // Cannot use a computed here because '_sorted' 
  // changing creates unnecessary computation cycles.
  //
  // Extra work is to be avoided, since '_currentItems' 
  // deals directly with stamping repeated DOM elements
  // while scrolling.
  async __updateCurrentItems(data) {

    try {

      if (!data) { return; }

      if (!this._sorted) {

        this._currentItems = data;

        return;
      }

      if (data.length !== this._sorted.length) { return; }

      // Arrange data according to container order.
      this._currentItems = this._sorted.reduce((accum, entry, index) => {

        accum[entry.target.index] = data[index];

        return accum;
      }, []);

    }
    catch (error) {
      if (error === 'throttled' || error === 'debounced') { return; }
      console.error(error);
    }
  }


  __updatePagination(index, count) {

    if (
      typeof index !== 'number' || 
      count < 3                 ||
      !this._hostBbox           ||
      !this._sampleBbox
    ) { 
      return; 
    }

    this.fire('lite-list-pagination-changed', {
      value: {
        count,
        direction:  this._direction,
        index,
        itemBbox:   this._sampleBbox,
        parentBbox: this._hostBbox,
        per:        this._containersPer // How many items per row/column.
      }
    });
  }


  __updateVirtualStart(sorted) {

    if (!sorted || !this._virtualIndex) {

      this._virtualStart = 0;
      
      return;
    }

    const offset = sorted.findIndex(entry => 
                     entry.target.index === this._containerIndex);

    this._virtualStart = this._virtualIndex - offset;
  }


  __hostScrollHandler(event) {

    consumeEvent(event);

    window.requestAnimationFrame(() => {
      this._scroll = this.scrollLeft;
    });
  }


  __windowScrollHandler() {

    // Do NOT disrupt this global event from propagating.

    window.requestAnimationFrame(() => {
      this._scroll = window.scrollY;
    });
  }


  async __domChangeHandler(event) {

    consumeEvent(event);

    await schedule(); // Wait for DOM rendering to settle.

    this._containers = this.selectAll('.container');
  }

  // Shift the base scroll calculation to correctly place
  // the item horizontally, according to the desired position.
  __getScroll(position, start) {

    if (position === 'start') { return start; }

    const magnitude = position === 'center' ? 0.5 : 1;

    // Shift by minus host size, plus the item size.
    return start - (this._hostSize * magnitude) + (this._sampleSize * magnitude);
  }

  // In order to scroll to far offscreen positions, 
  // that currently have no content, first grow the size of 
  // the scroller before scrolling to the correct position.
  __scrollToIndex(index, position, behavior) {

    // Returns the column/row aware section index from an absolute index.
    // Num --> Num
    const getSection = i => Math.floor(i / this._containersPer);

    const requestedSection = getSection(index);
    const distance         = this._sampleSize * requestedSection;
    const requestedSize    = distance + this._hostSize;
    const maxSection       = getSection(this.items.length);
    const maxSize          = this._sampleSize * maxSection;
    const size             = this.infinite ? 
                               requestedSize :

                               // Toward the end of the list, limit 
                               // the size of the scroller so we 
                               // don't scroll past the last item.
                               Math.min(requestedSize, maxSize);

    // Host's ::before psuedo element.
    const beginning = this.layout === 'vertical' ? this._hostBbox.top : 0;
    const start     = beginning + distance;
    const scroll    = this.__getScroll(position, start);

    // Grow the ::before pseudo element in preparation for scrolling
    // beyond the original height of the host container.
    if (this.layout === 'vertical') {

      this.updateStyles({
        '--before-height': `${size}px`,
        '--before-width':  'unset'
      });

      window.scroll({top: scroll, left: 0, behavior});
    }
    else {

      this.updateStyles({
        '--before-height': 'unset',
        '--before-width':  `${size}px`
      });

      this.scroll({top: 0, left: scroll, behavior});
    }    
  }


  // Smooth scrolling move to an item by its index.
  animateToIndex(index, position = 'start') {

    this.__scrollToIndex(index, position, 'smooth');

    return Promise.resolve(); // Align api with 'moveToIndex'.
  }

  // Instant move to an item by its index.
  moveToIndex(index, position = 'start') { 

    this.__scrollToIndex(index, position, 'instant'); 

    return this.__reposition();
  }

}

window.customElements.define(LiteList.is, LiteList);
