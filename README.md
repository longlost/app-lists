# app-lists

A collection of custom elements, each designed to work with a list of similar DOM elements.


## \<drag-drop-list\>
 
  This element allows list items to be rearranged via drag-and-drop.
   
  

### Example Usage


  my-elements/my-list.html


  ```html

  <drag-drop-list sortable=".sortable-class">
    <template is="dom-repeat" items="[[items]]">
      <div class="sortable-class">
        <img src$="[[item]]"/>
      </div>
    </template>
  </drag-drop-list>

  ```

## \<lite-list\>
 
  This element displays list items in a high performance scroller.
   
  The list items are recycled so that the number of DOM elements remains low, even for very large lists. 

  In fact, the maximum number of dom elements created by lite-list is dependent on the size dimensions of the host element relative to the size of the list elements. The number of stamped elements is determined by using the minimum value between the input array length and the computed maximum allowed number of elements.

  So, as your list grows, say via pagination for example, the DOM memory footprint of lite-list is capped to an easily manageable level.

### Example Usage


  my-elements/pup-list.js

  ```javascript

  import '@longlost/app-lists/lite-list.js';

    ...

    static get properties() {
      return {

        // Main input collection.
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
        _currentItems: Array

      };
    }

    // Required.
    // 
    // This event handler keeps slotted items in sync
    // with lite-list's internal DOM elements.
    __currentItemsChangedHandler(event) {
      this._currentItems = event.detail.value;
    }

  ```

  my-elements/pup-list.html

  ```html

  <style>

    /* 
      It is required that each repeated element be the same size.
    */
    .item {
      /* 
        Notice 'height' is set here to guarantee uniformity for all items. 
      */
      height: 176px;

      /* Nothing special here... */
      padding:          16px;
      border-bottom:    2px solid lightgray;
      background-color: white;
      color:            black;
    }

  </style>


  <lite-list infinite
             items="[[items]]"
             on-lite-list-current-items-changed="__currentItemsChangedHandler">

    <template is="dom-repeat" 
              items="[[_currentItems]]">

      <div class="item" 
           slot$="slot-[[index]]"> <!-- This data-bound attribute is required. -->
        <h2>[[item.name]]</h2>
        <p>Recycled item [[index]]</p>
      </div>

    </template>

  </lite-list>

  ```
