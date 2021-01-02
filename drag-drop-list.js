
/**
  * `drag-drop-list`
  *
  *   Port of github sharedlabs/sortable-list.
  *
  *
  *  <drag-drop-list sortable=".sortable-class">
  *    <template is="dom-repeat" items="[[items]]">
  *      <div class="sortable-class">
  *        <img src$="[[item]]"/>
  *      </div>
  *    </template>
  *  </drag-drop-list>
  *
  *
  *
  * @customElement
  * @polymer
  * @demo demo/index.html
  *
  *
  **/


import {GestureEventListeners}      from '@polymer/polymer/lib/mixins/gesture-event-listeners.js';
import * as Gestures                from '@polymer/polymer/lib/utils/gestures.js';
import {AppElement, html}           from '@longlost/app-core/app-element.js';
import {getComputedStyle, schedule} from '@longlost/app-core/utils.js';
import htmlString                   from './drag-drop-list.html';


class DragDropList extends GestureEventListeners(AppElement) {
  static get is() { return 'drag-drop-list'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {

      /**
       * This is a CSS selector string. If this is set, only items that 
       * match the CSS selector are sortable.
       */
      sortable: String,

      /**
       * Disables the draggable if set to true.
       */
      disabled: {
        type: Boolean,
        reflectToAttribute: true,
        value: false
      },

      /**
       * This is a CSS selector string. If this is set, only nested items that 
       * match the CSS selector are sortable.
       *
       * This is generally useful to find elements that are nested inside 
       * intermediate custom elements that are set to display their child elements.
       * ie. display: contents;
       */
      nestedSelector: String, 

      /**
       * True when an item is being dragged.
       */
      _dragging: {
        type: Boolean,
        value: false
      },

      /**
       * The list of sortable items.
       */
      _items: Array,

      // Collection of sortable DOM element bounding client rect measurement objects.
      _rects: Array,

      // Must keep track of state for sorted items 
      // when new items are added or old ones are removed.
      _state: Object,

      // Element currently being interacted with.
      _target: Object,

      // The corresponding bounding rect for currently dragged element.
      _targetRect: Object

    };
  }


  static get observers() {
    return [
      '__disabledChanged(disabled)'
    ];
  }


  connectedCallback() {
    super.connectedCallback();

    this.__resize = this.__resize.bind(this);

    window.addEventListener('resize', this.__resize);
  } 


  disconnectedCallback() {
    super.disconnectedCallback();

    window.removeEventListener('resize', this.__resize);
  }


  async __disabledChanged(disabled) {
    // Elements can override scroll direction with 
    // Gestures.setTouchAction(node, action), 
    // where action is one of 'pan-x', 'pan-y', 'none', 
    // or 'auto', and node is the one with the 
    // gesture listener attached.

    if (disabled) {  
      Gestures.setTouchAction(this.$.items, 'auto'); 
    }
    else {
      Gestures.setTouchAction(this.$.items, 'none'); 
    }
  }

  // Reset container values.
  __resize() {
    this.style.height = '100%';
    this.style.width  = '100%';
  }


  __itemFromEvent(event) {
    const path = event.composedPath();
    const item = path.find(el => this._items.includes(el));
    return item;
  }


  __getItemsRects() {
    return this._items.map(item => item.getBoundingClientRect());
  }


  __addTransformStyles(el) {
    el.style['left']        = '0px';
    el.style['margin']      = '0px';
    el.style['position']    = 'fixed';
    el.style['top']         = '0px';
    el.style['transition']  = 'none';
    el.style['will-change'] = 'transform';
    el.style['z-index']     = '1';
  }


  __removeTransformStyles(el) {
    el.style['left']        = 'unset';
    el.style['position']    = 'relative';
    el.style['top']         = 'unset';
    el.style['transition']  = 'none';
    el.style['will-change'] = 'auto';
    el.style['z-index']     = '0';
  }


  __addPressedStyles(el) {
    el.style['transition'] = 'none';
  }


  __removePressedStyles(el) {
    el.style['transition'] = 'transform 0.2s cubic-bezier(0.333, 0, 0, 1)';
  }


  __addDraggedStyles(el) {
    el.style['box-shadow'] = `0px 2px 2px 0px rgba(0, 0, 0, 0.14),
                              0px 1px 5px 0px rgba(0, 0, 0, 0.12),
                              0px 3px 1px -2px rgba(0, 0, 0, 0.2)`;
    el.style['filter']  = 'brightness(1.1)';
    el.style['z-index'] = '2';
  }


  __removeDraggedStyles(el) {
    el.style['-webkit-box-shadow'] = 'unset';
    el.style['box-shadow']         = 'unset';
    el.style['filter']             = 'unset';
    el.style['z-index']            = '0';
  }


  __translate3d(x, y, z, el) {
    el.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;
  } 


  __trackStart(event) {

    if (this.disabled) { return; }

    this._target = this.__itemFromEvent(event);

    if (!this._target) { return; }

    event.stopPropagation();

    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }    

    const {height, width} = this.getBoundingClientRect();

    this.style.height = `${height}px`;
    this.style.width  = `${width}px`;

    this._rects      = this.__getItemsRects();
    this._targetRect = this._rects[this._items.indexOf(this._target)];


    this._items.forEach(async (item, index) => {
      const rect = this._rects[index];

      item.__originalMargin = getComputedStyle(item, 'margin');
      item.__originalWidth  = item.style['width'];
      item.__originalHeight = item.style['height'];
      item.style['width']   = `${rect.width}px`;
      item.style['height']  = `${rect.height}px`;

      this.__addTransformStyles(item);

      this.__translate3d(rect.left, rect.top, 0, item);


      if (item !== this._target) {

        await schedule();

        item.style['transition'] = 'transform 0.2s cubic-bezier(0.333, 0, 0, 1)';
      }
    });


    this.__addDraggedStyles(this._target);

    this._dragging = true;
  }


  __itemFromCoords({x, y}) {
    if (!this._rects) { return; }

    const index = this._rects.findIndex(rect => 
      x >= rect.left &&
      x <= rect.left + rect.width &&
      y >= rect.top &&
      y <= rect.top + rect.height
    );

    return this._items[index];
  }


  /**
   * Move an array item from one position to another.     
   * Source: http://stackoverflow.com/questions/5306680/move-an-array-element-from-one-array-position-to-another
   */
  __moveItemArray(array, oldIndex, newIndex) {

    if (newIndex >= array.length) {
      let k = newIndex - array.length;
      while ((k--) + 1) {
        array.push(undefined);
      }
    }

    array.splice(newIndex, 0, array.splice(oldIndex, 1)[0]);

    return array;
  }


  async __track(event) {
    if (!this._dragging) { return; }

    const left = this._targetRect.left + event.detail.dx;
    const top  = this._targetRect.top  + event.detail.dy;

    this.__translate3d(left, top, 0, this._target);

    const overItem = this.__itemFromCoords(event.detail);


    if (overItem && overItem !== this._target) {

      const overItemIndex = this._items.indexOf(overItem);
      const targetIndex   = this._items.indexOf(this._target);

      this.__moveItemArray(this._items, targetIndex, overItemIndex);

      // Must keep track of state for sorted items 
      // when new items are added or old ones are removed.
      this._state = this._items.reduce((accum, item, index) => {
        accum[item.__sortStateKey] = index;
        return accum;
      }, {});


      this._items.forEach((item, index) => {

        if (item !== this._target) {
          const rect = this._rects[index];

          window.requestAnimationFrame(() => {
            this.__translate3d(rect.left, rect.top, 0, item);
          });
        }
      });
    }
  }

  
  __trackEnd(event) {
    if (!this._dragging) { return; }

    this.__removePressedStyles(this._target);

    const rect = this._rects[this._items.indexOf(this._target)];

    this.__translate3d(rect.left, rect.top, 0, this._target);

    this._dragging = false;

    this.fire('drag-drop-list-item-dropped', {
      data:   event.detail,
      target: this._target
    });
  }


  __onTransitionEnd() {
    if (this._dragging || !this._target) { return; }

    const x = window.scrollX;
    const y = window.scrollY;

    this._items.forEach((item, index) => {

      const {left, top} = this._rects[index];

      this.__removeTransformStyles(item);

      item.style['transform'] = '';
      item.style['margin']    = item.__originalMargin;
      item.style['height']    = item.__originalHeight;
      item.style['width']     = item.__originalWidth;
      item.style['left']      = `${left - item.__originalLeft + x}px`;
      item.style['top']       = `${top  - item.__originalTop  + y}px`;
    });

    this.style.height = '';

    this.__removeDraggedStyles(this._target);

    this.fire('drag-drop-list-sorted', {
      items:  this._items, 
      target: this._target
    });

    this._target     = undefined;
    this._rects      = undefined;
    this._targetRect = undefined;
  }


  __onDragStart(event) {
    event.preventDefault();
  }


  __onContextMenu(event) {
    if (!this._dragging) { return; }

    event.preventDefault();
    this.__trackEnd();
  }


  __onTouchMove(event) {
    if (this.disabled) { return; }

    event.preventDefault();
  }


  __getItems() {

    const slotted = this.slotNodes('#slot');

    if (!Array.isArray(slotted) || slotted.length === 0) {
      return;
    }

    if (this.sortable) {

      if (this.nestedSelector) {        

        return slotted.
          filter(node => 
            node.nodeType === Node.ELEMENT_NODE && node.matches(this.sortable)).
          flatMap(node => this.selectAll(this.nestedSelector, node));
      }

      return slotted.filter(node => 
        node.nodeType === Node.ELEMENT_NODE && node.matches(this.sortable));
    }

    return slotted.filter(node => node.nodeType === Node.ELEMENT_NODE);
  }


  __separateItems(allItems) {
    if (!Array.isArray(allItems)) { return; }
    
    return allItems.reduce((accum, item) => {

      if (typeof item.__originalLeft === 'number') {
        accum.oldItems.push(item);
      }
      else {
        accum.newItems.push(item);
      }

      return accum;
    }, {oldItems: [], newItems: []});
  }



  __updateItems() {

    if (this._dragging) { return; }

    const allItems = this.__getItems();

    if (!allItems) {
      this._items = undefined;
      this._state = undefined;
      this.fire('drag-drop-list-items-changed', {items: undefined});
      return;
    }

    // Must keep sorted state in tact.
    const {oldItems, newItems} = this.__separateItems(allItems);

    // Record initial placement.
    // Elements are translated relative 
    // to their original positions.
    if (newItems.length > 0) {

      const x = window.scrollX;
      const y = window.scrollY;

      newItems.forEach(item => {

        if (typeof item.__originalLeft !== 'number') {

          const {left, top} = item.getBoundingClientRect();

          item.__originalLeft = left + x;
          item.__originalTop  = top  + y;

          // Set a unique accessor to access this._state
          // when new items are added or old ones removed.
          item.__sortStateKey = Symbol();
        }

        item.addEventListener('transitionend', this.__onTransitionEnd.bind(this));
      });
    }

    if (oldItems.length > 0) {

      if (this._state) {

        const sortedItems = oldItems.reduce((accum, item) => {

          const prevIndex  = this._state[item.__sortStateKey];
          accum[prevIndex] = item;

          return accum;
        }, []);

        // Remove empty entries for items that may have been removed/missing.
        const collapsed = sortedItems.filter(item => item);

        this._items = [...collapsed, ...newItems];
      }
      else {
        this._items = [...oldItems, ...newItems]; 
      }      
    }
    else {
      this._items = newItems;
      this._state = undefined;
    }

    this.fire('drag-drop-list-items-changed', {items: this._items});
  }


  __slotChangeHandler() {
    this.__updateItems();
  }


  __onTrack(event) {
    switch(event.detail.state) {
      case 'start': 
        this.__trackStart(event); 
        break;
      case 'track': 
        this.__track(event);      
        break;
      case 'end':   
        this.__trackEnd(event);   
        break;
    }
  }

}

window.customElements.define(DragDropList.is, DragDropList);
