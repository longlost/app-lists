
/**
  * `recycled-list`
  * 
  *   This element displays list items in a high performance scroller.
  *   
  *   The list items are recycled so that the number of DOM elements remains low
  *   even for very large lists.
  *
  *
  *   NOTE: Currently, it is REQUIRED that all elements have identical dimensions.
  *
  *
  *  Example Usage:
  *
  *
  *   pup-list.js
  *
  *   ```
  *     import '@longlost/app-lists/recycled-list.js';
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
  *
  *     __itemsChangedHandler(event) {
  *       this._items = event.detail.value;
  *     }
  *  
  *   ```
  *
  *   pup-list.html
  *
  *   ```
  *
  *     <style>
  *
  *       .item {
  *         min-height:       128px;
  *         min-width:        calc(100vw - 64px);
  *         margin-right:     8px;
  *         padding:          16px;
  *         border-bottom:    2px solid lightgray;
  *         background-color: white;
  *         color:            black;
  *       }
  *
  *     </style>
  *
  *  
  *     <recycled-list infinite
  *                    items="[[items]]"
  *                    on-recycled-list-current-items-changed="__itemsChangedHandler">
  *
  *       <template is="dom-repeat" 
  *                 items="[[_items]]">
  *
  *         <div class="item" 
  *              slot$="slot-[[index]]">
  *           <h2>[[item.name]]</h2>
  *           <p>Recycled item [[index]]</p>
  *         </div>
  *
  *       </template>
  *
  *     </recycled-list>
  *
  *   ```
  *
  *
  *
  *  Properties:
  *
  *
  *   hMargin - Optional, Number, Default: 2
  *
  *     The height of `recycled-list` is multiplied by
  *     this number when stamping reusable containers.  
  *    
  *     The new value is used to calculate how many 
  *     reusable items will be created, based off how many
  *     containers will fit inside an virtual container of this size.
  *    
  *     A larger number will result in more offscreen containers,
  *     so there is a tradeoff between scrolling performance and
  *     memory/computational load.
  *      
  *     When tuning rendering performance, this number should scale 
  *     in proportion to the height of individual repeated containers.
  *      
  *     Increase this number for taller containers that take up a 
  *     large portion of the viewport.
  *      
  *     The lower bounds of this number is clamped at 1.5.
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
  *   wMargin - Optional, Number, Default: 4
  *    
  *     The width of `recycled-list` is multiplied by
  *     this number when stamping reusable containers. 
  *      
  *     The new value is used to calculate how many 
  *     reusable items will be created, based off how many
  *     containers will fit inside an virtual container of this size.
  *      
  *     A larger number will result in more offscreen containers,
  *     so there is a tradeoff between scrolling performance and
  *     memory/computational load.
  *      
  *     When tuning rendering performance, this number should scale 
  *     in proportion to the width of individual repeated containers.
  *      
  *     Increase this number for wider containers that take up a 
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
  *   'recycled-list-current-items-changed', {value: items}
  *
  *     Detail value is an array which is a subset of the provided 'items' array. 
  *     This array MUST drive the external template repeater, to keep items 
  *     synchronized with their recycled containers.
  *
  *
  * 
  *   'recycled-list-pagination-changed', {value: {count, end, start}} 
  *
  *     Detail value is an object that contains 'count' 
  *     (number of recycled containers), 'start' and 'end' indexes.
  *     'start' represents the current topmost/leftmost visible item.
  *     'count' and 'end' are only hints to the developer and 
  *     are not strict boundaries or limits.
  *
  *
  *
  *   'recycled-list-sample-bbox-changed', {value: DOMRect} 
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


import {
  AppElement, 
  html
} from '@longlost/app-core/app-element.js';

import {DomObserversMixin} from './dom-observers-mixin.js';

import {
  head,
  tail
} from '@longlost/app-core/lambda.js';

import {
  consumeEvent,
  schedule
} from '@longlost/app-core/utils.js';

import htmlString from './recycled-list.html';


const sortVerticalAscending = entries => 
                                entries.sort((a, b) => 
                                  a.boundingClientRect.top - b.boundingClientRect.top);


const sortHorizontalAscending = entries => 
                                  entries.sort((a, b) => 
                                    a.boundingClientRect.left - b.boundingClientRect.left);


// Vertical layouts when scrolling down.
const moveAvailableDown = (visible, hidden) => {

  const topVisible = head(visible);

  // Hidden items that are above the scroller can be moved down.
  // Hidden items that are still below the fold need to stay where they are.
  const {availableToMove, notAvailable} = hidden.reduce((accum, entry) => {

    if (entry.boundingClientRect.bottom <= topVisible.boundingClientRect.top) {
      accum.availableToMove.push(entry);
    }
    else {
      accum.notAvailable.push(entry);
    }

    return accum;
  }, {availableToMove: [], notAvailable: []});

  if (!availableToMove.length) { return; }

  // Combine visible items with hidden items that 
  // are still below the fold (direction of scroll), if there are any.
  const rest = sortVerticalAscending([...visible, ...notAvailable]);

  const bottomRest = tail(rest);
  const {bottom}   = bottomRest.boundingClientRect;

  availableToMove.forEach((entry, index) => {
    const {boundingClientRect, target} = entry;
    const {height, top}                = boundingClientRect;

    const previous = target.previous || 0;
    const h        = height * index;
    const distance = previous + bottom - top + h;

    target.previous           = distance; // Cache for next move.
    target.style['transform'] = `translateY(${distance}px)`;
  });
};

// Vertical layouts when scrolling up.
const moveAvailableUp = (visible, hidden) => {

  const bottomVisible = tail(visible);

  // Hidden items that are below the scroller can be moved up.
  // Hidden items that are still above the scroller need to stay where they are.
  const {availableToMove, notAvailable} = hidden.reduce((accum, entry) => {

    if (entry.boundingClientRect.top >= bottomVisible.boundingClientRect.bottom) {

      // Reverse the array so items can be 'stacked' properly
      // in the 'forEach' function below, which uses the index
      // as a multiplier with each stacked container's height.
      accum.availableToMove.unshift(entry);
    }
    else {
      accum.notAvailable.push(entry);
    }

    return accum;
  }, {availableToMove: [], notAvailable: []});

  if (!availableToMove.length) { return; }

  // Combine visible items with hidden items that 
  // are still above the scroller (direction of scroll), if there are any.
  const rest = sortVerticalAscending([...notAvailable, ...visible]);

  const topRest = head(rest);
  const {top}   = topRest.boundingClientRect;

  availableToMove.forEach((entry, index) => {
    const {boundingClientRect, target} = entry;
    const {bottom, height}             = boundingClientRect;

    const previous = target.previous || 0;

    if (previous === 0) { return; }

    const h        = height * index;
    const distance = previous - (bottom - top) - h;

    if (distance < 0) { return; }

    target.previous           = distance; // Cache for next move.
    target.style['transform'] = `translateY(${distance}px)`;
  });
};

// Horizontal layouts when scrolling left to right.
const moveAvailableRight = (visible, hidden) => {

  const leftVisible = head(visible);

  // Hidden items that are to the left of the scroller can be moved right.
  // Hidden items that are still to the right 
  // of the scroller need to stay where they are.
  const {availableToMove, notAvailable} = hidden.reduce((accum, entry) => {

    if (entry.boundingClientRect.right <= leftVisible.boundingClientRect.left) {
      accum.availableToMove.push(entry);
    }
    else {
      accum.notAvailable.push(entry);
    }

    return accum;
  }, {availableToMove: [], notAvailable: []});

  if (!availableToMove.length) { return; }

  // Combine visible items with hidden items that 
  // are still to the right (direction of scroll), if there are any.
  const rest = sortHorizontalAscending([...visible, ...notAvailable]);

  const rightRest = tail(rest);
  const {right}   = rightRest.boundingClientRect;

  availableToMove.forEach((entry, index) => {
    const {boundingClientRect, target} = entry;
    const {width, left}                = boundingClientRect;

    const previous = target.previous || 0;
    const w        = width * index;
    const distance = previous + right - left + w;

    target.previous           = distance; // Cache for next move.
    target.style['transform'] = `translateX(${distance}px)`;
  });
};

// Horizontal layouts when scrolling right to left.
const moveAvailableLeft = (visible, hidden) => {

  const rightVisible = tail(visible);

  // Hidden items that are to the right of the scroller can be moved left.
  // Hidden items that are still left of the scroller need to stay where they are.
  const {availableToMove, notAvailable} = hidden.reduce((accum, entry) => {

    if (entry.boundingClientRect.left >= rightVisible.boundingClientRect.right) {

      // Reverse the array so items can be 'stacked' properly
      // in the 'forEach' function below, which uses the index
      // as a multiplier with each stacked container's width.
      accum.availableToMove.unshift(entry);
    }
    else {
      accum.notAvailable.push(entry);
    }

    return accum;
  }, {availableToMove: [], notAvailable: []});

  if (!availableToMove.length) { return; }

  // Combine visible items with hidden items that 
  // are still above the scroller, if there are any.
  const rest = sortHorizontalAscending([...notAvailable, ...visible]);

  const leftRest = head(rest);
  const {left}   = leftRest.boundingClientRect;

  availableToMove.forEach((entry, index) => {
    const {boundingClientRect, target} = entry;
    const {right, width}               = boundingClientRect;

    const previous = target.previous || 0;

    if (previous === 0) { return; }

    const w        = width * index;
    const distance = previous - (right - left) - w;

    if (distance < 0) { return; }

    target.previous           = distance; // Cache for next move.
    target.style['transform'] = `translateX(${distance}px)`;
  });
};


class RecycledList extends DomObserversMixin(AppElement) {

  static get is() { return 'recycled-list'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {

      // Will start back at beginning of 'items' when scrolled past the last
      // item in the list when 'infinite' is set.
      infinite: Boolean,

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
      // 'items' array, used by parent implementing 'recycled-list',
      // to keep its mirrored template repeater items in sync with 
      // the one used in this element's Shadow DOM.
      _currentItems: Array,

      _data: {
        type: Array,
        computed: '__computeData(infinite, items, _containerCount, _start)'
      },

      // The current scroll direction, 'up', 'down', 'left' or 'right'.
      _direction: {
        type: String,
        observer: '__directionChanged'
      },

      // This becomes true when the amount of containers changes.
      // Necessary to correct for screen rotation/resizes.
      _needsRepositioning: Boolean,

      // This current scrolled distance of the host element.
      _scroll: {
        type: Number,
        observer: '__scrollChanged'
      },

      _skipCurrentItemsUpdate: Boolean,

      _sorted: {
        type: Array,
        computed: '__computeSorted(layout, _containers, _hidden)'
      },

      _start: {
        type: Number,
        value: 0,
        computed: '__computeStart(infinite, items, _virtualStart)'
      },

      _stopRecycling: {
        type: Boolean,
        computed: '__computeStopRecycling(infinite, items, _containerCount, _virtualStart)'
      },

      _virtualIndex: {
        type: Number,
        value: 0,
        computed: '__computeVirtualIndex(layout, _sampleBbox, _scroll)'
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
      '__layoutChanged(layout)',
      '__moveAvailableContainers(_sorted)',
      '__sampleBboxChanged(_sampleBbox)',
      '__updateCurrentItems(_data)',
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
    this.removeEventListener('scroll',   this.__hostScrollHandler);
  }


  __computeContainerIndex(count, virtualIndex) {

    if (!count || !virtualIndex) { return 0; }

    return virtualIndex % count;
  }


  __computeContainerItems(count) {

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

  // Get live position measurements, sort by position,
  // and create a collection that is similar to 
  // IntersectionObserverEntry to standardize the api.
  __computeSorted(layout, containers, hidden) {

    if (!layout || !containers || !hidden) { return; }

    const entries = containers.map(container => ({
      boundingClientRect: container.getBoundingClientRect(),
      target:             container
    }));

    return layout === 'vertical' ? 
             sortVerticalAscending(entries) : 
             sortHorizontalAscending(entries);
  }


  __computeStart(infinite, items, virtualStart) {

    if (!items || !items.length) { return 0; }

    const length = items.length;

    // Number of iteration cycles over 'items'.
    const multiple = Math.floor(virtualStart / length);

    if (multiple && !infinite) {
      return length;
    }

    return virtualStart - (length * multiple);
  }


  __computeStopRecycling(infinite, items, count, virtualStart) {

    if (infinite || !items || !count) { return false; }

    const last = items.length - 1;

    return virtualStart + count > last;
  }


  __computeVirtualIndex(layout, sampleBbox, scroll) {

    if (!layout || !sampleBbox || typeof scroll !== 'number') { return 0; }

    const {height, left, top, width} = sampleBbox;

    if (!height || !width) { return 0; }

    const beginning = layout === 'vertical' ? top    : left;
    const dimension = layout === 'vertical' ? height : width;

    return Math.floor(Math.abs((scroll - beginning) / dimension));
  }


  __currentItemsChanged(items) {

    if (!items) { return; }

    this.fire('recycled-list-current-items-changed', {value: items});
  }

  // When changing scroll direction, the first change to this._data
  // happens before the container elements are resorted properly,
  // so set a lock that will ensure this erroneous state is ignored.
  __directionChanged(_, oldVal) {

    if (oldVal) {
      this._skipCurrentItemsUpdate = true;
    }
  }


  __layoutChanged(layout) {

    if (!layout) { return; }

    if (layout === 'vertical') {
      this.removeEventListener('scroll', this.__hostScrollHandler);
      window.addEventListener('scroll',  this.__windowScrollHandler);
    }
    else {
      window.removeEventListener('scroll', this.__windowScrollHandler);
      this.addEventListener('scroll',      this.__hostScrollHandler);
    }
  }

  // Correct the position of containers when some have been removed or added.
  // This commonly occurs after screen rotation or resize changes.
  __repositionContainers() {

    if (typeof this._containerIndex !== 'number' || !this._virtualIndex) { return; }

    const translate = this.layout === 'vertical' ? 'translateY' : 'translateX';
    const reference = head(this._containers);
    const {height}  = reference.getBoundingClientRect();
    const position  = height * (this._virtualIndex - this._containerIndex);

    this._containers.forEach(el => {
      el.previous           = position;
      el.style['transform'] = `${translate}(${position}px)`;
    });

    // Force a new set of calculations that place 
    // the data items in the proper containers.
    const temp = this._entries;

    this._entries = undefined;
    this._entries = temp;
  }


  async __moveAvailableContainers(sorted) {

    if (
      !this._direction ||
      !sorted          || 
      !sorted.length   || 
      !this._hidden    || 
      !this._hidden.length
    ) { return; }

    // This corrects for screen orientation/resize changes.
    if (this._needsRepositioning) {
      this._needsRepositioning = false;

      await schedule();

      this.__repositionContainers();

      return;
    }

    if (this._stopRecycling && (this._direction === 'down' || this._direction === 'right')) { return; }

    // This rare state happens when IntersectionObserver hasn't 
    // updated the state of all containers yet, 
    // and so is an erroneous state that must be ignored.
    if (this._hidden.length === sorted.length) { return; }

    const {sortedHidden, sortedVisible} = sorted.reduce((accum, entry) => {

      const match = this._hidden.find(obj => obj.target === entry.target);

      if (match) {
        accum.sortedHidden.push(entry);
      }
      else {
        accum.sortedVisible.push(entry);
      }

      return accum;
    }, {sortedHidden: [], sortedVisible: []});

    // An erroneous state, where there are no 
    // visible elements, that must be ignored.
    if (sortedVisible.length === 0) { return; }

    // Translate containers according to scroll direction.
    switch (this._direction) {

      case 'down':
        moveAvailableDown(sortedVisible, sortedHidden);
        break;

      case 'up':
        moveAvailableUp(sortedVisible, sortedHidden);
        break;

      case 'right':
        moveAvailableRight(sortedVisible, sortedHidden);
        break;

      case 'left':
        moveAvailableLeft(sortedVisible, sortedHidden);
        break;

      default:
        throw new Error(`The 'direction' argument value is unrecognized.`);
    }
  }


  __sampleBboxChanged(bbox) {

    this.fire('recycled-list-sample-bbox-changed', {value: bbox});
  }


  __scrollChanged(newVal = 0, oldVal = 0) {

    // This corrects an issue caused by programmic scrolling 
    // to top which misplaces containers due to IntersecionObserver
    // lagging behind the speed of scrolling up. 
    // 
    // This is especially problematic when the list has been scrolled
    // down quite a bit, resulting in a high rate of scroll velocity.
    //
    // Programmic scrolling includes built in scroll to top functionality 
    // on Apple touch devices (when top of ui chrome is tapped), as
    // well as calls to window.scrollTo(0).
    if (newVal === 0 && oldVal && this._containers) {

      this._containers.forEach(el => {
        el.previous           = 0;
        el.style['transform'] = 'none';
      });
    }

    if (this.layout === 'vertical') {
      this._direction = newVal > oldVal ? 'down' : 'up';
    }
    else if (this.layout === 'horizontal') {
      this._direction = newVal > oldVal ? 'right' : 'left';
    }
  }

  // Cannot use a computed here because '_sorted' 
  // changing creates unnecessary computation cycles.
  //
  // Extra work is to be avoided, since '_currentItems' 
  // deals directly with stamping repeated DOM elements
  // while scrolling.
  __updateCurrentItems(data) {

    if (!data) { return; }

    if (!this._sorted) { 
      this._currentItems = data;
      return;
    }

    // When changing scroll direction, the first change to data
    // happens before the container elements are resorted properly,
    // so ignore this erroneous state.
    if (this._skipCurrentItemsUpdate) {
      this._skipCurrentItemsUpdate = false;
      return;
    }

    // Arrange data according to container order.
    this._currentItems = this._sorted.reduce((accum, entry, index) => {
      accum[entry.target.index] = data[index];
      return accum;
    }, []);
  }


  __updatePagination(index, count) {

    this.fire('recycled-list-pagination-changed', {
      value: {
        count,
        end:   index + count, 
        start: index
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

    window.requestAnimationFrame(() => {
      this._scroll = window.scrollY;
    });
  }


  async __domChangeHandler(event) {

    consumeEvent(event);

    await schedule(); // Wait for DOM rendering to settle.

    if (this._containers) {
      this._needsRepositioning = true;
    }

    this._containers = this.selectAll('.container');
  }

}

window.customElements.define(RecycledList.is, RecycledList);
