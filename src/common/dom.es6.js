'use strict';

let dom = {};

dom.Text = class {
  constructor(params = {}) {
    this.getter = params.getter; // undefined is fine
    this.element = document.createElement('div');
    if(typeof params.DOMClass !== 'undefined') {
      this.element.classList.add(params.DOMClass);
    }

    if(typeof params.text !== 'undefined') {
      this.element.innerHTML = params.text;
    }

    this.update();

    const DOMOrigin = (typeof params.DOMOrigin !== 'undefined'
                       ? params.DOMOrigin : document.body);
    DOMOrigin.appendChild(this.element);
  }

  update(text) {
    if(typeof text !== 'undefined') {
      this.element.innerHTML = text;
    } else if(typeof this.getter !== 'undefined' && this.getter() ) {
      this.element.innerHTML = this.getter();
    }
  }

};

dom.Button = class {
  constructor(params = {}) {
    this.setter = params.setter; // undefined is fine
    this.element = document.createElement('button');
    if(typeof params.DOMClass !== 'undefined') {
      this.element.classList.add(params.DOMClass);
    }
    for(let a in params.DOMAttributes) {
      if(params.DOMAttributes.hasOwnProperty(a) ) {
        this.element.setAttribute(a, params.DOMAttributes[a]);
      }
    }
    if(typeof params.text !== 'undefined') {
      this.element.innerHTML = params.text;
    }

    if(typeof this.setter !== 'undefined') {
      const that = this; // problem with gulp-es6-transpiler 1.0.1
      this.element.onclick = this.element.ontouchstart
        = (event) => {
          event.preventDefault();
          that.setter();
        };
    }

    const DOMOrigin = (typeof params.DOMOrigin !== 'undefined'
                       ? params.DOMOrigin : document.body);
    DOMOrigin.appendChild(this.element);
  }

};

dom.Toggle = class extends dom.Button {
  constructor(params) {
    super(params);
    this.getter = params.getter; // undefined is fine

    this.element.classList.add('toggle');
    if(typeof this.setter !== 'undefined') {
      const that = this; // problem with gulp-es6-transpiler 1.0.1
      this.element.onclick = this.element.ontouchstart
        = (event) => {
          event.preventDefault();
          that.setter(that.element.classList.toggle('selected') );
      };
    }

    this.update();
  }

  update() {
    if(typeof this.getter !== 'undefined' && this.getter() ) {
      this.element.classList.add('selected');
    } else {
      this.element.classList.remove('selected');
    }
  }
};

dom.Input = class {
  constructor(params) {
    this.setter = params.setter; // undefined is fine
    this.getter = params.getter; // undefined is fine

    this.element = document.createElement('input');
    if(typeof params.DOMClass !== 'undefined') {
      this.element.classList.add(params.DOMClass);
    }
    for(let a in params.DOMAttributes) {
      if(params.DOMAttributes.hasOwnProperty(a) ) {
        this.element.setAttribute(a, params.DOMAttributes[a]);
      }
    }

    if(typeof this.setter !== 'undefined') {
      const that = this; // problem with gulp-es6-transpiler 1.0.1
      this.element.onchange = () => {
        that.setter(that.element.value);
      };
    }

    this.update();

    const DOMOrigin = (typeof params.DOMOrigin !== 'undefined'
                       ? params.DOMOrigin : document.body);
    DOMOrigin.appendChild(this.element);
  }

  update() {
    if(typeof this.getter !== 'undefined') {
      this.element.value = this.getter();
    }
  }
};

dom.Select = class {
  constructor(params) {
    this.setter = params.setter; // undefined is fine
    this.getter = params.getter; // undefined is fine

    this.element = document.createElement('select');
    if(typeof params.DOMClass !== 'undefined') {
      this.element.classList.add(params.DOMClass);
    }
    for(let a in params.DOMAttributes) {
      if(params.DOMAttributes.hasOwnProperty(a) ) {
        this.element.setAttribute(a, params.DOMAttributes[a]);
      }
    }

    for(let o of params.options) {
      const option = document.createElement('option');
      option.textContent = o;
      this.element.add(option);
    }

    if(typeof this.setter !== 'undefined') {
      const that = this; // problem with gulp-es6-transpiler 1.0.1
      this.element.onchange = () => {
        that.setter(that.element.value);
      };
    }

    this.update();

    const DOMOrigin = (typeof params.DOMOrigin !== 'undefined'
                       ? params.DOMOrigin : document.body);
    DOMOrigin.appendChild(this.element);
  }

  update() {
    if(typeof this.getter !== 'undefined') {
      this.element.value = this.getter();
    }
  }

};

dom.ExclusiveToggles = class {
  constructor(params) {
    this.setter = params.setter; // undefined is fine
    this.getter = params.getter; // undefined is fine

    this.element = document.createElement('div');
    if(typeof params.DOMClass !== 'undefined') {
      this.element.classList.add(params.DOMClass);
    }

    if(typeof params.value !== 'undefined'
       && typeof this.setter !== 'undefined') {
      this.setter(params.value);
    }

    if(typeof params.options !== 'undefined') {
      this.setOptions(params.options);
    }

    const DOMOrigin = (typeof params.DOMOrigin !== 'undefined'
                       ? params.DOMOrigin : document.body);
    DOMOrigin.appendChild(this.element);
  }

  update() {
    const buttons = this.element.querySelectorAll('button');
    const value = (typeof this.getter !== 'undefined'
                   ? this.getter() : '');
    for(let b = 0; b < buttons.length; ++b) {
      if(buttons[b].textContent === value) {
        buttons[b].classList.add('selected');
      } else {
        buttons[b].classList.remove('selected');
      }
    }
  }

  setOptions(options = {}) {
    // old is a NodeList, which is not iterable
    const old = this.element.querySelectorAll('button');
    for(let o = 0; o < old.length; ++o) {
      this.element.removeChild(old[o]);
    }

    const that = this; // problem with gulp-es6-transpiler 1.0.1
    for(let o of options) {
      const option = document.createElement('button');
      option.textContent = o;
      option.onclick = option.ontouchstart
        = (event) => { // eslint-disable-line no-loop-func
          event.preventDefault();
          if(typeof that.setter !== 'undefined') {
            that.setter(option.textContent);
          }
          that.update();
        };

      this.element.appendChild(option);
    }

    this.update();
  }

};

module.exports = exports = dom;
