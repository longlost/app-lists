
/**
  * `DomObserversMixin`
  * 
  *   Intersection and Resize Observer api logic for `lite-list`.
  *
  *
  *
  *  Properites:
  *
  *
  *    
  *
  *
  *
  *
  *
  *
  * @customElement
  * @polymer
  * @demo demo/index.html
  *
  **/


import {head} from '@longlost/app-core/lambda.js';


const getMargin = ({hostSide, hostSize, margin, sampleSide, sampleSize}) => {

  if (!hostSide || !hostSize || !margin || !sampleSide || !sampleSize) { return; }

  const diff = sampleSize - hostSize;

  // Special care must be taken with IntersectionObserver
  // when the child containers are larger than the host.
  if (diff > 0) {

    const offset = Math.max((sampleSide - hostSide), 0);
    
    return `${sampleSize + offset}px`;
  }

  return `${margin * 25}%`;
};


export const DomObserversMixin = superClass => {

  return class DomObserversMixin extends superClass {    


    static get properties() {
      return {

        // The collection used to 'hydrate' each repeated element.
        //
        // Indirectly drives repeater.
        //
        // Only a subset of the items is used at a time, 
        // dependent on scroll position.
        items: Array,

        // Determines whether the list should scroll vertically or horizontally.
        layout: {
          type: String,
          value: 'vertical', // Or 'horizontal'.
          reflectToAttribute: true
        },

        // The size of `lite-list` is multiplied by
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
        // in proportion to the size of individual repeated containers.
        //
        // Increase this number for containers that take up a 
        // large portion of the viewport.
        //
        // The lower bounds of this number is clamped at 1.5.
        margin: {
          type: Number,
          value: 4
        },

        _containerCount: {
          type: Number,
          value: 1,
          computed: '__computeContainerCount(items.length, _maxContainerCount)'
        },

        // Wrapper elements for repeated slots.
        // The total stamped DOM containers that are present once 
        // the number of items that will fill the host has been determined.
        _containers: {
          type: Array,        
          observer: '__containersChanged'
        },

        // Containers per row for 'vertical' layouts, or per column for 'horizontal'.
        _containersPer: {
          type: Number,
          value: 1,
          computed: '__computeContainersPer(layout, _hostBbox, _sampleBbox)'
        },

        _dimension: {
          type: String,
          value: 'height', // or 'width'
          computed: '__computeDimension(layout)'
        },

        // The total set of IntersectionObserverEntry objects for every DOM element container.
        // This list is updated when each time an entry changes its intersectional state.
        _entries: Array,

        // Intersection Observer entries for '_containers' that are not visible.
        _hidden: {
          type: Array,
          computed: '__computeHidden(_entries, _threshold)'
        },

        _hostBbox: Object,

        _hostSize: {
          type: Number,
          computed: '__computeSize(_dimension, _hostBbox)'
        },

        // IntersectionObserver instance.
        _intersectionObserver: Object,

        _marginBottom: {
          type: String,
          computed: '__computeMarginBottom(margin, _hostBbox, _sampleBbox)'
        },

        _marginLeft: {
          type: String,
          computed: '__computeMarginLeft(margin, _hostBbox, _sampleBbox)'
        },

        _marginRight: {
          type: String,
          computed: '__computeMarginRight(margin, _hostBbox, _sampleBbox)'
        },

        _marginTop: {
          type: String,
          computed: '__computeMarginTop(margin, _hostBbox, _sampleBbox)'
        }, 

        // Determines the maximum number of recyclable containers to stamp out,
        // given the particular layout, host size plus margin and item size.
        _maxContainerCount: {
          type: Number,
          value: 1,
          computed: '__computeMaxContainerCount(margin, _hostSize, _sampleSize, _containersPer)'
        },     

        _resizeObserver: Object,

        _root: {
          type: Object,
          computed: '__computeRoot(layout)'
        },

        // The initial stamped item.
        // Used to determine the number reusable containers to 
        // stamp which will fill the host.
        //
        // '_hostBbox' used as timing trigger only.
        _sampleBbox: {
          type: Object,
          computed: '__computeSampleBbox(_containers, _hostBbox)'
        },

        _sampleSize: {
          type: Number,
          computed: '__computeSize(_dimension, _sampleBbox)'
        },

        _side: {
          type: String,
          value: 'top', // or 'left'
          computed: '__computeSide(layout)'
        },

        _threshold: {
          type: Number,
          computed: '__computeThreshold(_hostSize, _sampleSize)'
        }

      };
    }


    static get observers() {
      return [
        '__containersItemCountChanged(_containers, _containerCount)'
      ];
    }


    connectedCallback() {

      super.connectedCallback();

      this.__observeHost();
    }


    disconnectedCallback() {

      super.disconnectedCallback();

      this.__cleanUpObservers();
    }


    __computeContainerCount(length = 1, max = 1) {

      return Math.min(length, max);
    }

    // This ui element must be aware of the layout of its children contianers
    // so that it can place them properly in the same layout.
    // For example, if there are 2 items per row, in a vertical scrolling
    // configuration, the element will translate containers in sets of 2.
    __computeContainersPer(layout, hostBbox, sampleBbox) {

      if (!layout || !hostBbox || !sampleBbox) { return 1; }

      const dim = layout === 'vertical' ? 'width' : 'height';
      
      return Math.max(Math.floor(hostBbox[dim] / sampleBbox[dim]), 1);
    }


    __computeDimension(layout) {

      return layout === 'vertical' ? 'height' : 'width';
    }


    __computeHidden(entries, threshold) {

      if (!entries || typeof threshold !== 'number') { return; }

      if (threshold === 0) {
        return entries.filter(entry => entry.intersectionRatio === 0);
      }

      const signifigantFigures = num => Math.round(num * 1000);

      return entries.filter(entry => 
               signifigantFigures(entry.intersectionRatio) < signifigantFigures(threshold));
    }


    __computeMarginBottom(margin, hostBbox, sampleBbox) {

      return getMargin({
        hostSide: hostBbox?.bottom, 
        hostSize: hostBbox?.height, 
        margin, 
        sampleSide: sampleBbox?.bottom, 
        sampleSize: sampleBbox?.height
      });
    }


    __computeMarginLeft(margin, hostBbox, sampleBbox) {

      return getMargin({
        hostSide: hostBbox?.left, 
        hostSize: hostBbox?.width, 
        margin, 
        sampleSide: sampleBbox?.left, 
        sampleSize: sampleBbox?.width
      });
    }


    __computeMarginRight(margin, hostBbox, sampleBbox) {

      return getMargin({
        hostSide: hostBbox?.right, 
        hostSize: hostBbox?.width, 
        margin, 
        sampleSide: sampleBbox?.right, 
        sampleSize: sampleBbox?.width
      });
    }


    __computeMarginTop(margin, hostBbox, sampleBbox) {

      return getMargin({
        hostSide: hostBbox?.top, 
        hostSize: hostBbox?.height, 
        margin, 
        sampleSide: sampleBbox?.top, 
        sampleSize: sampleBbox?.height
      });
    }


    __computeMaxContainerCount(margin, hostSize, sampleSize, per) {

      if (!hostSize || !sampleSize) { return 1; }

      const defaulted = margin || 4;
      const clamped   = Math.max(defaulted, 1.5);
      const sections  = Math.ceil((hostSize * clamped) / sampleSize);

      return sections * per;
    }


    __computeRoot(layout) {

      return layout === 'vertical' ? null : this;
    }


    __computeSampleBbox(containers) {

      if (!containers || !containers.length) { return; }

      return head(containers).getBoundingClientRect();
    }


    __computeSide(layout) {

      return layout === 'vertical' ? 'top' : 'left';
    }


    __computeSize(dimension, bbox) {

      return bbox?.[dimension];
    }

    // When containers are larger than the host,
    // the threshold must be a percentage representing
    // the ratio of the two sizes.
    __computeThreshold(hostSize, sampleSize) {

      if (!hostSize || !sampleSize) { return 0; }
      if (hostSize > sampleSize)    { return 0; }

      const percentage = hostSize / sampleSize;
      const threshold  = 1 - percentage;

      return threshold;
    }


    __containersChanged(_, oldContainers) {

      if (oldContainers) {
        this.__cleanUpContainersObserver(oldContainers);
      }
    }


    __containersItemCountChanged(containers, count) {

      if (!containers || containers.length < 2 || !count) { return; }

      if (containers.length === count) {
        this.__observeContainers(containers);
      }
    }


    __observeHost() {

      if (this._resizeObserver) { 
        this.__cleanUpResizeObserver();
        return;
      }

      this._resizeObserver = new window.ResizeObserver(entries => {
        this._hostBbox = head(entries).target.getBoundingClientRect();
      });

      this._resizeObserver.observe(this);
    }


    __observeContainers(containers) {

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

            return match || entry;
          });
        }
      };

      const options = {
        root:       this._root,
        rootMargin: `${this._marginTop} ${this._marginRight} ${this._marginBottom} ${this._marginLeft}`,
        threshold:  this._threshold
      };

      this._intersectionObserver = new window.IntersectionObserver(callback, options);

      containers.forEach(el => {
        this._intersectionObserver.observe(el);
      });
    }


    __cleanUpContainersObserver(containers) {

      if (this._intersectionObserver) {

        if (containers) {        
          containers.forEach(el => {
            this._intersectionObserver.unobserve(el);
          });
        }

        this._intersectionObserver = undefined;
      }
    }


    __cleanUpResizeObserver() {

      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
        this._resizeObserver = undefined;
      }
    }


    __cleanUpObservers() {

      this.__cleanUpContainersObserver(this._containers);
      this.__cleanUpResizeObserver();
    }   

  };
};
