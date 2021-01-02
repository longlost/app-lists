# app-lists

A collection of custom elements, each designed to work with a list of DOM elements.


## \<app-carousel\>
 
  This element displays list items in a high performance scroller.
   
  The list items are recycled so that the number of DOM elements remains low
  even for very large lists.


### Example Usage


  pup-list.js

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

  pup-list.html

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
