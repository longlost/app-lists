
/**
  * `recycled-list`
  * 
  *   This element displays list items in a high performance scroller.
  *   
  *   The list items are recycled so that the number of DOM elements remains low
  *   even for very large lists.
  *
  *
  *  Example Usage:
  *
  *
  *   pup-list.js
  *
      ```
        import '@longlost/app-lists/recycled-list.js';
  
      ...

        static get properties() {
          return {

            // Master list input collection.
            items: {
              type: Array,
              value: [
                {name: 'Spirit'},
                {name: 'Bub'},
                {name: 'Hunter'},
                {name: 'Bandit'},
                {name: 'Molly'},
                {name: 'Bear'},
                {name: 'Lady'},
                {name: 'Dunny'},
                {name: 'Red'},
                {name: 'Cindy'},
                {name: 'Suzie'},
                {name: 'Mia'},
                {name: 'Rex'},
                {name: 'Mercedes'},
                {name: 'Oscar'},
                {name: 'Fancy'},
                {name: 'Rover'},
                {name: 'Wendy'},
                {name: 'Spot'},
                {name: 'Buddy'},
                {name: 'Fido'},
                {name: 'Puddles'},
                {name: 'Woofie'},
                {name: 'Snickers'}
              ]
            },

            // Drives implementation's <template is="dom-repeat">
            _items: Array

          };
        }


        __itemsChangedHandler(event) {
          this._items = event.detail.value;
        }
    
      ```
  *
  *   pup-list.html
  *
      ```

        <style>

          .item {
            min-height:       128px;
            min-width:        calc(100vw - 64px);
            margin-right:     8px;
            padding:          16px;
            border-bottom:    2px solid lightgray;
            background-color: white;
            color:            black;
          }

        </style>

    
        <recycled-list infinite
                       items="[[items]]"
                       on-recycled-list-current-items-changed="__itemsChangedHandler">

          <template is="dom-repeat" 
                    items="[[_items]]">

            <div class="item" 
                 slot$="slot-[[index]]">
              <h2>[[item.name]]</h2>
              <p>Recycled item [[index]]</p>
            </div>

          </template>

        </recycled-list>

      ```
  *
  *
  *
  *
  *
  *  Properties:
  *
  *
  *    
  *
  *
  *
  *  Events:
  *
  *
  *   'recycled-list-current-items-changed' - Detail value is an array which is a subset of the provided
  *                                           'items' array. This array MUST drive the external template
  *                                           repeater.
  *
  * 
  *   'recycled-list-pagination-changed' - Detail value is an object that contains 'start' and 'end' indexes.
  *   
  *  
  *  Methods:
  *
  *
  *    
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

import {
  compose,
  head,
  split,
  tail,
  trim
} from '@longlost/app-core/lambda.js';

import {
  consumeEvent,
  getComputedStyle
} from '@longlost/app-core/utils.js';

import htmlString from './recycled-list.html';


const sortVerticalAscending = entries => 
                                entries.sort((a, b) => 
                                  a.boundingClientRect.top - b.boundingClientRect.top);


const sortHorizontalAscending = entries => 
                                  entries.sort((a, b) => 
                                    a.boundingClientRect.left - b.boundingClientRect.left);


// String input format ie. 'matrix(1, 0, 0, 1, 0, 640)' --> 640.
const getYFromMatrixStyle = compose(split(','), tail, trim, split(')'), head);


const secondToLast = array => array[array.length - 2];

// String input format ie. 'matrix(1, 0, 0, 1, 686, 0)' --> 686.
const getXFromMatrixStyle = compose(split(','), secondToLast, trim);


const getPreviousVerticalDistance = el => {
  const style = getComputedStyle(el, 'transform');

  if (style === 'none') { return 0; }

  const y = getYFromMatrixStyle(style);

  return Number(y);  
};


const getPreviousHorizontalDistance = el => {
  const style = getComputedStyle(el, 'transform');

  if (style === 'none') { return 0; }

  const x = getXFromMatrixStyle(style);

  return Number(x);  
};

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
    const {height, top} = entry.boundingClientRect;
    const previous      = getPreviousVerticalDistance(entry.target);
    const h             = height * index;
    const distance      = previous + bottom - top + h;

    entry.target.style['transform'] = `translateY(${distance}px)`;
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
    const {bottom, height} = entry.boundingClientRect;
    const previous         = getPreviousVerticalDistance(entry.target);

    if (previous === 0) { return; }

    const h        = height * index;
    const distance = previous - (bottom - top) - h;

    if (distance < 0) { return; }

    entry.target.style['transform'] = `translateY(${distance}px)`;
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
    const {width, left} = entry.boundingClientRect;
    const previous      = getPreviousHorizontalDistance(entry.target);
    const w             = width * index;
    const distance      = previous + right - left + w;

    entry.target.style['transform'] = `translateX(${distance}px)`;
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
    const {right, width} = entry.boundingClientRect;
    const previous       = getPreviousHorizontalDistance(entry.target);

    if (previous === 0) { return; }

    const w        = width * index;
    const distance = previous - (right - left) - w;

    if (distance < 0) { return; }

    entry.target.style['transform'] = `translateX(${distance}px)`;
  });
};


class RecycledList extends AppElement {

  static get is() { return 'recycled-list'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {

      // The height of `recycled-list` is multiplied by
      // this number when stamping reusable containers.  
      //
      // The new value is used to calculate how many 
      // reusable items will be created, based off how many
      // containers will fit inside an virtual container of this size.
      //
      // A larger number will result in more offscreen containers,
      // so there is a tradeoff between scrolling performance and
      // memory/computational load.
      //
      // When tuning rendering performance, this number should scale 
      // in proportion to the height of individual repeated containers.
      //
      // Increase this number for taller containers that take up a 
      // large portion of the viewport.
      //
      // The lower bounds of this number is clamped at 1.5.
      hMargin: {
        type: Number,
        value: 2
      },

      // Will start back at beginning of 'items' when scrolled past the last
      // item in the list when 'infinite' is set.
      infinite: Boolean,

      // The collection used to 'hydrate' each repeated element.
      //
      // Indirectly drives repeater.
      //
      // Only a subset of the items is used at a time, 
      // dependent on scroll position.
      items: Array,

      layout: {
        type: String,
        value: 'vertical', // Or 'horizontal'.
        reflectToAttribute: true
      },

      // The width of `recycled-list` is multiplied by
      // this number when stamping reusable containers. 
      //
      // The new value is used to calculate how many 
      // reusable items will be created, based off how many
      // containers will fit inside an virtual container of this size.
      //
      // A larger number will result in more offscreen containers,
      // so there is a tradeoff between scrolling performance and
      // memory/computational load.
      //
      // When tuning rendering performance, this number should scale 
      // in proportion to the width of individual repeated containers.
      //
      // Increase this number for wider containers that take up a 
      // large portion of the viewport.
      //
      // The lower bounds of this number is clamped at 1.5.
      wMargin: {
        type: Number,
        value: 4
      },

      _containerIndex: {
        type: Number,
        computed: '__computeContainerIndex(_containerCount, _virtualIndex)'
      },

      // Wrapper elements for repeated slots.
      _containers: Array,

      // A subset of provided 'items' that represents the currently
      // visible set of virtual elements. This is a slice of the 
      // 'items' array, used by parent implementing 'recycled-list',
      // to keep its mirrored template repeater items in sync with 
      // the one used in this element's Shadow DOM.
      _currentItems: Array,

      _data: {
        type: Array,
        computed: '__computeData(items, infinite, _containerCount, _start)'
      },

      // The current scroll direction, 'up', 'down', 'left' or 'right'.
      _direction: String,

      // A reference to the total stamped DOM containers that are present once 
      // the number of items that will fill the 'box' has been determined.
      _containers: Array,

      // The total set of IntersectionObserverEntry objects for every DOM element container.
      // This list is updated when each time an entry changes its intersectional state.
      _entries: Array,

      // Height dimension of the host element.
      _height: Number,

      // Intersection Observer entries for '_containers' that are not visible.
      _hidden: {
        type: Array,
        computed: '__computeHidden(_entries)'
      },

      // Determines how many recyclable containers to stamp out,
      // given the particular layout, host size plus margin and item size.
      _containerCount: {
        type: Number,
        value: 1,
        computed: '__computeContainerCount(layout, hMargin, wMargin, _height, _width, _sampleBbox)'
      },

      // Drives the `template` repeater.
      _containerItems: {
        type: Array,
        computed: '__computeContainerItems(items, _containerCount)'
      },

      _resizeObserver: Object,

      // The initial stamped item.
      // Used to determine the number reusable containers to 
      // stamp which will fill the box.
      //
      // '_height' and '_width' used as timing triggers only.
      _sampleBbox: {
        type: Object,
        computed: '__computeSampleBbox(_containers, _height, _width)'
      },

      // This current scrolled distance of the host element.
      _scroll: {
        type: Number,
        observer: '__scrollChanged'
      },

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

      _triggered: Boolean,

      _triggerIntObserver: Object,

      _virtualIndex: {
        type: Number,
        value: 0,
        computed: '__computeVirtualIndex(layout, _sampleBbox, _scroll)'
      },

      _virtualStart: {
        type: Number,
        value: 0
      },

      // Width dimension of the host element.
      _width: Number

    };
  }


  static get observers() {
    return [
      '__moveAvailableContainers(_direction, _sorted)',
      '__containersItemCountChanged(_containers, _containerCount)',
      '__currentItemsChanged(_currentItems)',
      '__layoutChanged(layout)',
      '__layoutTriggeredChanged(layout, _triggered)',
      '__updateCurrentItems(_data)',
      '__updatePagination(_virtualIndex, _containerCount)',
      '__updateVirtualStart(_hidden)'
    ];
  }


  constructor() {
    super();

    this.__hostScrollHandler   = this.__hostScrollHandler.bind(this);
    this.__windowScrollHandler = this.__windowScrollHandler.bind(this);
  }


  connectedCallback() {
    super.connectedCallback();

    this.__observeHost();
  }


  disconnectedCallback() {
    super.disconnectedCallback();

    window.removeEventListener('scroll', this.__windowScrollHandler);
    this.removeEventListener('scroll',   this.__hostScrollHandler);
    this.__cleanUpObservers();
  }


  __computeContainerIndex(count, virtualIndex) {
    if (!count || !virtualIndex) { return 0; }

    return virtualIndex % count;
  }


  __computeData(items, infinite, count, start) {
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


  __computeHidden(entries) {
    if (!entries) { return; }

    return entries.filter(entry => entry.intersectionRatio === 0);
  }


  __computeContainerItems(items, count) {
    if (!items) { return; }

    const length = Math.min(items.length, count);

    return Array(length).fill(undefined);
  }


  __computeContainerCount(layout, hMargin, wMargin, h, w, sampleBbox) {
    if (!layout || !h || !w || !sampleBbox) { return 1; }

    const {height, width} = sampleBbox;

    if (!height || !width) { return 1; }

    if (layout === 'vertical') {
      const multiplier = hMargin || 2;

      return Math.ceil((h * Math.max(multiplier, 1.5)) / height);
    }

    if (layout === 'horizontal') {
      const multiplier = wMargin || 4;

      return Math.ceil((w * Math.max(multiplier, 1.5)) / width);
    }

    return 1;
  }


  __computeSampleBbox(containers) {
    if (!containers || !containers.length) { return; }

    return head(containers).getBoundingClientRect();
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


  __scrollChanged(newVal = 0, oldVal = 0) {
    if (this.layout === 'vertical') {
      this._direction = newVal > oldVal ? 'down' : 'up';
    }
    else if (this.layout === 'horizontal') {
      this._direction = newVal > oldVal ? 'right' : 'left';
    }
  }


  __moveAvailableContainers(direction, sorted) {
    if (
      !direction     || 
      !sorted        || 
      !sorted.length || 
      !this._hidden  || 
      !this._hidden.length
    ) { return; }

    if (this._stopRecycling && (direction === 'down' || direction === 'right')) { return; }

    // This rare state happens when IntersectionObserver hasn't 
    // updated the state of all containers yet, 
    // and so is an erronous state that must be ignored.
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


    switch (direction) {

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


  __containersItemCountChanged(containers, count) {
    if (!containers || containers.length < 2 || !count) { return; }

    this.__cleanUpContainersObserver();

    if (containers.length === count) {
      this.__observeContainers();
    }
  }


  __currentItemsChanged(items) {
    if (!items) { return; }

    this.fire('recycled-list-current-items-changed', {value: items});
  }

  // Cannot use a computed here because '_sorted' 
  // changing creates unnecessary computation cycles.
  //
  // Extra work is to avoided, since '_currentItems' 
  // deals directly with stamping repeated DOM elements
  // while scrolling.
  __updateCurrentItems(data) {
    if (!data) { return; }

    if (!this._sorted) { 
      this._currentItems = data;
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
        end:   index + count, 
        start: index
      }
    });
  }


  __updateVirtualStart(hidden) {

    if (!hidden || !this._virtualIndex) {
      this._virtualStart = 0;
      return;
    }

    const offset = this._sorted.findIndex(entry => 
                     entry.target.index === this._containerIndex);

    this._virtualStart = this._virtualIndex - offset;
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

    this.__observeTrigger(layout);
  }


  __growBox(dimension) {
    const listDim = dimension === 'height' ? this._height : this._width;
    const boxDim  = this.$.box.getBoundingClientRect()[dimension];
    const newDim  = this._stopRecycling ? boxDim - listDim : listDim + boxDim;

    this.$.box.style['min-height']       = 'initial';
    this.$.box.style['min-width']        = 'initial';
    this.$.box.style[`min-${dimension}`] = `${newDim}px`; 
  }


  __layoutTriggeredChanged(layout, triggered) {
    if (!layout) { return; }

    if (triggered) {

      const dimension = layout === 'vertical' ? 'height' : 'width';

      this.__growBox(dimension);
    }
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


  __observeHost() {

    if (this._resizeObserver) { 
      this.__cleanUpResizeObserver();
      return;
    }

    this._resizeObserver = new window.ResizeObserver(entries => {

      const {height, width} = entries[0].contentRect;

      this._height = height;
      this._width  = width;
    });

    this._resizeObserver.observe(this);
  }


  __observeTrigger(layout) {

    if (this._triggerIntObserver) { 
      this.__cleanUpTriggerObserver();
      return; 
    }

    const callback = entries => {
      this._triggered = entries[0].intersectionRatio === 1;
    };

    const root = layout === 'vertical' ? null : this;

    const options = {
      root,
      rootMargin: '150%',
      threshold:   1
    };

    this._triggerIntObserver = new window.IntersectionObserver(callback, options);
    this._triggerIntObserver.observe(this.$.trigger);
  }


  __observeContainers() {

    if (this._containersIntObserver) {
      this.__cleanUpContainersObserver();
      return; 
    }

    // IntersectionObserver initializes with an entry for each
    // observed container, then only provides entries to containers
    // which have intersectional state updates as necessary.
    // So keep a list of all entries and update them over time.
    // This way, all offscreen vs visible items is known at all times.
    const callback = entries => {

      if (entries.length === this._containerCount) {
        this._entries = entries;        
      }
      else {
        this._entries = this._entries.map(entry => {

          const match = entries.find(update => 
                          update.target === entry.target);

          return match ? match : entry;
        });
      }
    };

    const root       = this.layout === 'vertical' ? null : this;
    const margin     = this.layout === 'vertical' ? this.hMargin : this.wMargin;
    const rootMargin = `${margin * 25}%`;

    const options = {
      root,
      rootMargin,
      threshold: 0
    };

    this._containersIntObserver = new window.IntersectionObserver(callback, options);

    this._containers.forEach(el => {
      this._containersIntObserver.observe(el);
    });
  }


  __cleanUpContainersObserver() {
    if (this._containersIntObserver) {

      this._containers.forEach(el => {
        this._containersIntObserver.unobserve(el);
      });

      this._containersIntObserver = undefined;
    }
  }


  __cleanUpResizeObserver() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = undefined;
    }
  }


  __cleanUpTriggerObserver() {
    if (this._triggerIntObserver) {
      this._triggerIntObserver.unobserve(this.$.trigger);
      this._triggerIntObserver = undefined;
    }    
  }


  __cleanUpObservers() {    
    this.__cleanUpContainersObserver();
    this.__cleanUpResizeObserver();
    this.__cleanUpTriggerObserver();
  }


  __domChangeHandler(event) {
    consumeEvent(event);

    this._containers = this.selectAll('.container');
  }

}

window.customElements.define(RecycledList.is, RecycledList);
