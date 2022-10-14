# app-lists

A collection of custom elements, each designed to work with a list of similar DOM elements.


## \<drag-drop-list\>
 
  This element allows list items to be rearranged via drag-and-drop.
   
  

### Example Usage


  my-elements/my-list.html


  ```

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
   
  The list items are recycled so that the number of DOM elements remains low even for very large lists.


### Example Usage


  my-elements/pup-list.js

  ```

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
        _items: Array

      };
    }


    __itemsChangedHandler(event) {
      this._items = event.detail.value;
    }

  ```

  my-elements/pup-list.html

  ```

  <style>

    .item {
      height:           176px;
      padding:          16px;
      border-bottom:    2px solid lightgray;
      background-color: white;
      color:            black;
    }

  </style>


  <lite-list infinite
             items="[[items]]"
             on-lite-list-current-items-changed="__itemsChangedHandler">

    <template is="dom-repeat" 
              items="[[_items]]">

      <div class="item" 
           slot$="slot-[[index]]">
        <h2>[[item.name]]</h2>
        <p>Recycled item [[index]]</p>
      </div>

    </template>

  </lite-list>

  ```
