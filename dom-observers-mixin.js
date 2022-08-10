
/**
  * `DomObserversMixin`
  * 
  *   Intersection and Resize Observer api logic for `recycled-list`.
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


export const DomObserversMixin = superClass => {

  return class DomObserversMixin extends superClass {    


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

        // The total set of IntersectionObserverEntry objects for every DOM element container.
        // This list is updated when each time an entry changes its intersectional state.
        _entries: Array,

        // Intersection Observer entries for '_containers' that are not visible.
        _hidden: {
          type: Array,
          computed: '__computeHidden(_entries, _threshold)'
        },

        _hostBbox: Object,

        // IntersectionObserver instance.
        _intersectionObserver: Object,

        _marginBottom: {
          type: String,
          computed: '__computeMarginBottom(hMargin, _hostBbox, _sampleBbox)'
        },

        _marginLeft: {
          type: String,
          computed: '__computeMarginLeft(wMargin, _hostBbox, _sampleBbox)'
        },

        _marginRight: {
          type: String,
          computed: '__computeMarginRight(wMargin, _hostBbox, _sampleBbox)'
        },

        _marginTop: {
          type: String,
          computed: '__computeMarginTop(hMargin, _hostBbox, _sampleBbox)'
        }, 

        // Determines the maximum number of recyclable containers to stamp out,
        // given the particular layout, host size plus margin and item size.
        _maxContainerCount: {
          type: Number,
          computed: '__computeMaxContainerCount(layout, hMargin, wMargin, _hostBbox, _sampleBbox, _containersPer)'
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

        _threshold: {
          type: Number,
          computed: '__computeThreshold(layout, _hostBbox, _sampleBbox)'
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

      if (layout === 'vertical') {
        return Math.max(Math.floor(hostBbox.width / sampleBbox.width), 1);
      }

      if (layout === 'horizontal') {        
        return Math.max(Math.floor(hostBbox.height / sampleBbox.height), 1);
      }

      return 1;
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


    __computeMarginBottom(hMargin, hostBbox, sampleBbox) {

      if (!hMargin || !hostBbox || !sampleBbox) { return; }

      const diff = sampleBbox.height - hostBbox.height;

      // Special care must be taken with IntersectionObserver
      // when the child containers are larger than the host.
      if (diff > 0) {

        const offset = Math.max((sampleBbox.bottom - hostBbox.bottom), 0);
        
        return `${sampleBbox.height + offset}px`;
      }

      return `${hMargin * 25}%`;
    }


    __computeMarginLeft(wMargin, hostBbox, sampleBbox) {

      if (!wMargin || !hostBbox || !sampleBbox) { return; }

      const diff = sampleBbox.width - hostBbox.width;

      // Special care must be taken with IntersectionObserver
      // when the child containers are larger than the host.
      if (diff > 0) {

        const offset = Math.max((sampleBbox.left - hostBbox.left), 0);

        return `${sampleBbox.width + offset}px`;
      }

      return `${wMargin * 25}%`;
    }


    __computeMarginRight(wMargin, hostBbox, sampleBbox) {

      if (!wMargin || !hostBbox || !sampleBbox) { return; }

      const diff = sampleBbox.width - hostBbox.width;

      // Special care must be taken with IntersectionObserver
      // when the child containers are larger than the host.
      if (diff > 0) {

        const offset = Math.max((sampleBbox.right - hostBbox.right), 0);

        return `${sampleBbox.width + offset}px`;
      }

      return `${wMargin * 25}%`;
    }


    __computeMarginTop(hMargin, hostBbox, sampleBbox) {

      if (!hMargin || !hostBbox || !sampleBbox) { return; }

      const diff = sampleBbox.height - hostBbox.height;

      // Special care must be taken with IntersectionObserver
      // when the child containers are larger than the host.
      if (diff > 0) {

        const offset = Math.max((sampleBbox.top - hostBbox.top), 0);
        
        return `${sampleBbox.height + offset}px`;
      }

      return `${hMargin * 25}%`;
    }


    __computeMaxContainerCount(layout, hMargin, wMargin, hostBbox, sampleBbox, per) {

      if (!layout || !hostBbox || !sampleBbox) { return 1; }

      const {height, width} = sampleBbox;

      if (!height || !width) { return 1; }

      if (layout === 'vertical') {

        const defaulted = hMargin || 2;
        const margin    = Math.max(defaulted, 1.5);
        const sections  = Math.ceil((hostBbox.height * margin) / height);

        return sections * per;
      }

      if (layout === 'horizontal') {
        
        const defaulted = wMargin || 4;
        const margin    = Math.max(defaulted, 1.5);
        const sections  = Math.ceil((hostBbox.width * margin) / width);

        return sections * per;
      }

      return 1;
    }


    __computeRoot(layout) {

      return layout === 'vertical' ? null : this;
    }


    __computeSampleBbox(containers) {

      if (!containers || !containers.length) { return; }

      return head(containers).getBoundingClientRect();
    }

    // When containers are larger than the host,
    // the threshold must be a percentage representing
    // the ratio of the two sizes.
    __computeThreshold(layout, hostBbox, sampleBbox) {

      if (!layout || !hostBbox || !sampleBbox) { return 0; }

      if (layout === 'vertical') {

        if (hostBbox.height > sampleBbox.height) { return 0; }

        const percentage = hostBbox.height / sampleBbox.height;
        const threshold  = 1 - percentage;

        return threshold;
      }
      else {

        if (hostBbox.width > sampleBbox.width) { return 0; }

        const percentage = hostBbox.width / sampleBbox.width;
        const threshold  = 1 - percentage;

        return threshold;
      }
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

            return match ? match : entry;
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
