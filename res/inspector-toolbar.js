"use strict";
(() => {
  // src/inspector/utils/xpath.ts
  var XPathUtils = class {
    static generateXPath(element) {
      if (!element) return "";
      if (element === document.body) return "//body";
      if (element === document.documentElement) return "/html";
      const steps = [];
      let contextNode = element;
      while (contextNode) {
        const step = this.getXPathStep(contextNode, contextNode === element);
        if (!step.value) break;
        steps.push(step.value);
        if (step.optimized) break;
        const parent = contextNode.parentNode;
        if (!parent || parent.nodeType === Node.DOCUMENT_NODE) break;
        contextNode = parent;
      }
      steps.reverse();
      return (steps.length && steps[0].includes("@id") ? "" : "/") + steps.join("/");
    }
    static getXPathStep(node, isTargetNode) {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return { value: "", optimized: false };
      }
      const id = node.getAttribute("id");
      if (id && this.isValidId(id)) {
        if (document.querySelectorAll(`#${CSS.escape(id)}`).length === 1) {
          return {
            value: `//*[@id="${id}"]`,
            optimized: true
          };
        }
      }
      const nodeName = node.nodeName.toLowerCase();
      if (nodeName === "body" || nodeName === "head" || nodeName === "html") {
        return {
          value: nodeName,
          optimized: true
        };
      }
      const ownIndex = this.getXPathIndex(node);
      if (ownIndex === -1) {
        return { value: "", optimized: false };
      }
      let ownValue = nodeName;
      if (isTargetNode && nodeName === "input" && node.getAttribute("type") && !id && !node.getAttribute("class")) {
        ownValue += `[@type="${node.getAttribute("type")}"]`;
      }
      if (ownIndex > 0) {
        ownValue += `[${ownIndex + 1}]`;
      }
      return {
        value: ownValue,
        optimized: false
      };
    }
    static getXPathIndex(node) {
      const siblings = node.parentNode?.children;
      if (!siblings) return 0;
      const areNodesSimilar = (left, right) => {
        if (left === right) return true;
        return left.nodeName.toLowerCase() === right.nodeName.toLowerCase();
      };
      let hasSameNamedElements = false;
      for (let i = 0; i < siblings.length; ++i) {
        if (areNodesSimilar(node, siblings[i]) && siblings[i] !== node) {
          hasSameNamedElements = true;
          break;
        }
      }
      if (!hasSameNamedElements) return 0;
      let ownIndex = 0;
      for (let i = 0; i < siblings.length; ++i) {
        if (areNodesSimilar(node, siblings[i])) {
          if (siblings[i] === node) {
            return ownIndex;
          }
          ++ownIndex;
        }
      }
      return -1;
    }
    static isValidId(id) {
      return Boolean(id) && /^\S.*$/.test(id) && !/[[\](){}<>]/.test(id);
    }
  };

  // src/inspector/managers/ElementSelectionManager.ts
  var ElementSelectionManager = class {
    constructor() {
      this.selectedElements = /* @__PURE__ */ new Map();
      this.badges = /* @__PURE__ */ new Map();
      this.colorIndex = 0;
      this.colors = [
        "#FF6B6B",
        "#FF9671",
        "#FFA75F",
        "#F9D423",
        "#FECA57",
        "#FF9FF3",
        "#FF7E67",
        "#FF8C42",
        "#FFC857",
        "#FFA26B"
      ];
    }
    selectElement(element, componentFinder) {
      const color = this.colors[this.colorIndex % this.colors.length];
      const index = this.selectedElements.size + 1;
      this.colorIndex++;
      element.style.outline = `3px solid ${color}`;
      element.style.outlineOffset = "-1px";
      const badge = this.createBadge(index, color, element, componentFinder);
      this.badges.set(element, badge);
      this.selectedElements.set(element, {
        color,
        originalOutline: element.style.outline,
        originalOutlineOffset: element.style.outlineOffset,
        index
      });
    }
    deselectElement(element) {
      const elementData = this.selectedElements.get(element);
      if (elementData) {
        ;
        element.style.outline = "";
        element.style.outlineOffset = "";
        const badge = this.badges.get(element);
        if (badge) {
          badge.remove();
          this.badges.delete(element);
        }
        this.selectedElements.delete(element);
        this.reindexElements();
      }
    }
    clearAllSelections() {
      this.selectedElements.forEach((_, element) => {
        ;
        element.style.outline = "";
        element.style.outlineOffset = "";
      });
      this.badges.forEach((badge) => badge.remove());
      this.badges.clear();
      this.selectedElements.clear();
      this.colorIndex = 0;
    }
    hasElement(element) {
      return this.selectedElements.has(element);
    }
    getSelectedElements() {
      return this.selectedElements;
    }
    getSelectedCount() {
      return this.selectedElements.size;
    }
    findSelectedParent(element) {
      let currentElement = element.parentElement;
      while (currentElement && currentElement !== document.body) {
        if (this.selectedElements.has(currentElement)) {
          return currentElement;
        }
        currentElement = currentElement.parentElement;
      }
      return null;
    }
    findSelectedChildren(element) {
      const children = [];
      this.selectedElements.forEach((_, selectedElement) => {
        if (element.contains(selectedElement) && selectedElement !== element) {
          children.push(selectedElement);
        }
      });
      return children;
    }
    buildHierarchicalStructure(componentFinder) {
      const rootElements = [];
      this.selectedElements.forEach((_, element) => {
        if (!this.findSelectedParent(element)) {
          rootElements.push(element);
        }
      });
      const buildElementInfo = (element) => {
        const data = this.selectedElements.get(element);
        const children = this.findSelectedChildren(element);
        const componentData = componentFinder?.(element);
        const elementInfo = {
          index: data.index,
          tagName: element.tagName,
          xpath: XPathUtils.generateXPath(element),
          textContent: element.textContent?.substring(0, 100) || "",
          attributes: Array.from(element.attributes).reduce((acc, attr) => {
            if (attr.name !== "style") {
              acc[attr.name] = attr.value;
            }
            return acc;
          }, {}),
          children: []
        };
        if (componentData) {
          elementInfo.componentData = componentData;
        }
        const directChildren = children.filter(
          (child) => this.findSelectedParent(child) === element
        );
        directChildren.forEach((child) => {
          elementInfo.children.push(buildElementInfo(child));
        });
        return elementInfo;
      };
      return rootElements.map((element) => buildElementInfo(element));
    }
    createBadge(index, color, element, componentFinder) {
      const badge = document.createElement("div");
      badge.classList.add("inspector-badge");
      const shadow = badge.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = `
      .badge {
        height: 20px;
        padding: 0 5px;
        background-color: ${color};
        color: white;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        pointer-events: none;
      }
    `;
      const badgeContent = document.createElement("div");
      badgeContent.classList.add("badge", "inspector-ignore");
      const component = componentFinder?.(element);
      if (component && component.componentLocation) {
        const componentPath = component.componentLocation.split("@")[0];
        const fileName = componentPath.split("/").pop();
        badgeContent.textContent = `(${index}) [${fileName}]`;
      } else {
        badgeContent.textContent = `(${index}) ${element.tagName}`;
      }
      shadow.appendChild(style);
      shadow.appendChild(badgeContent);
      const topMargin = -15;
      const leftMargin = 7;
      const rect = element.getBoundingClientRect();
      badge.style.position = "fixed";
      badge.style.top = `${rect.top + topMargin}px`;
      badge.style.left = `${rect.left + leftMargin}px`;
      badge.style.zIndex = "999998";
      document.body.appendChild(badge);
      const updatePosition = () => {
        const rect2 = element.getBoundingClientRect();
        badge.style.top = `${rect2.top + topMargin}px`;
        badge.style.left = `${rect2.left + leftMargin}px`;
      };
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      badge._cleanup = () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
      return badge;
    }
    reindexElements() {
      let index = 1;
      this.selectedElements.forEach((data, element) => {
        data.index = index;
        const badge = this.badges.get(element);
        if (badge) {
          const badgeContent = badge.shadowRoot?.querySelector(".badge");
          if (badgeContent) {
            badgeContent.textContent = `(${index}) ${element.tagName}`;
          }
        }
        index++;
      });
    }
  };

  // node_modules/@trpc/client/dist/objectSpread2-BvkFp-_Y.mjs
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
      key = keys[i];
      if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
        get: ((k) => from[k]).bind(null, key),
        enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
    value: mod,
    enumerable: true
  }) : target, mod));
  var require_typeof = __commonJS({ "../../node_modules/.pnpm/@oxc-project+runtime@0.72.2/node_modules/@oxc-project/runtime/src/helpers/typeof.js"(exports, module) {
    function _typeof$2(o) {
      "@babel/helpers - typeof";
      return module.exports = _typeof$2 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o$1) {
        return typeof o$1;
      } : function(o$1) {
        return o$1 && "function" == typeof Symbol && o$1.constructor === Symbol && o$1 !== Symbol.prototype ? "symbol" : typeof o$1;
      }, module.exports.__esModule = true, module.exports["default"] = module.exports, _typeof$2(o);
    }
    module.exports = _typeof$2, module.exports.__esModule = true, module.exports["default"] = module.exports;
  } });
  var require_toPrimitive = __commonJS({ "../../node_modules/.pnpm/@oxc-project+runtime@0.72.2/node_modules/@oxc-project/runtime/src/helpers/toPrimitive.js"(exports, module) {
    var _typeof$1 = require_typeof()["default"];
    function toPrimitive$1(t, r) {
      if ("object" != _typeof$1(t) || !t) return t;
      var e = t[Symbol.toPrimitive];
      if (void 0 !== e) {
        var i = e.call(t, r || "default");
        if ("object" != _typeof$1(i)) return i;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return ("string" === r ? String : Number)(t);
    }
    module.exports = toPrimitive$1, module.exports.__esModule = true, module.exports["default"] = module.exports;
  } });
  var require_toPropertyKey = __commonJS({ "../../node_modules/.pnpm/@oxc-project+runtime@0.72.2/node_modules/@oxc-project/runtime/src/helpers/toPropertyKey.js"(exports, module) {
    var _typeof = require_typeof()["default"];
    var toPrimitive = require_toPrimitive();
    function toPropertyKey$1(t) {
      var i = toPrimitive(t, "string");
      return "symbol" == _typeof(i) ? i : i + "";
    }
    module.exports = toPropertyKey$1, module.exports.__esModule = true, module.exports["default"] = module.exports;
  } });
  var require_defineProperty = __commonJS({ "../../node_modules/.pnpm/@oxc-project+runtime@0.72.2/node_modules/@oxc-project/runtime/src/helpers/defineProperty.js"(exports, module) {
    var toPropertyKey = require_toPropertyKey();
    function _defineProperty(e, r, t) {
      return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
        value: t,
        enumerable: true,
        configurable: true,
        writable: true
      }) : e[r] = t, e;
    }
    module.exports = _defineProperty, module.exports.__esModule = true, module.exports["default"] = module.exports;
  } });
  var require_objectSpread2 = __commonJS({ "../../node_modules/.pnpm/@oxc-project+runtime@0.72.2/node_modules/@oxc-project/runtime/src/helpers/objectSpread2.js"(exports, module) {
    var defineProperty = require_defineProperty();
    function ownKeys(e, r) {
      var t = Object.keys(e);
      if (Object.getOwnPropertySymbols) {
        var o = Object.getOwnPropertySymbols(e);
        r && (o = o.filter(function(r$1) {
          return Object.getOwnPropertyDescriptor(e, r$1).enumerable;
        })), t.push.apply(t, o);
      }
      return t;
    }
    function _objectSpread2(e) {
      for (var r = 1; r < arguments.length; r++) {
        var t = null != arguments[r] ? arguments[r] : {};
        r % 2 ? ownKeys(Object(t), true).forEach(function(r$1) {
          defineProperty(e, r$1, t[r$1]);
        }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r$1) {
          Object.defineProperty(e, r$1, Object.getOwnPropertyDescriptor(t, r$1));
        });
      }
      return e;
    }
    module.exports = _objectSpread2, module.exports.__esModule = true, module.exports["default"] = module.exports;
  } });

  // node_modules/@trpc/server/dist/observable-UMO3vUa_.mjs
  function observable(subscribe) {
    const self = {
      subscribe(observer) {
        let teardownRef = null;
        let isDone = false;
        let unsubscribed = false;
        let teardownImmediately = false;
        function unsubscribe() {
          if (teardownRef === null) {
            teardownImmediately = true;
            return;
          }
          if (unsubscribed) return;
          unsubscribed = true;
          if (typeof teardownRef === "function") teardownRef();
          else if (teardownRef) teardownRef.unsubscribe();
        }
        teardownRef = subscribe({
          next(value) {
            var _observer$next;
            if (isDone) return;
            (_observer$next = observer.next) === null || _observer$next === void 0 || _observer$next.call(observer, value);
          },
          error(err) {
            var _observer$error;
            if (isDone) return;
            isDone = true;
            (_observer$error = observer.error) === null || _observer$error === void 0 || _observer$error.call(observer, err);
            unsubscribe();
          },
          complete() {
            var _observer$complete;
            if (isDone) return;
            isDone = true;
            (_observer$complete = observer.complete) === null || _observer$complete === void 0 || _observer$complete.call(observer);
            unsubscribe();
          }
        });
        if (teardownImmediately) unsubscribe();
        return { unsubscribe };
      },
      pipe(...operations) {
        return operations.reduce(pipeReducer, self);
      }
    };
    return self;
  }
  function pipeReducer(prev, fn) {
    return fn(prev);
  }
  function observableToPromise(observable$1) {
    const ac = new AbortController();
    const promise = new Promise((resolve, reject) => {
      let isDone = false;
      function onDone() {
        if (isDone) return;
        isDone = true;
        obs$.unsubscribe();
      }
      ac.signal.addEventListener("abort", () => {
        reject(ac.signal.reason);
      });
      const obs$ = observable$1.subscribe({
        next(data) {
          isDone = true;
          resolve(data);
          onDone();
        },
        error(data) {
          reject(data);
        },
        complete() {
          ac.abort();
          onDone();
        }
      });
    });
    return promise;
  }

  // node_modules/@trpc/server/dist/observable-CUiPknO-.mjs
  function share(_opts) {
    return (source) => {
      let refCount = 0;
      let subscription = null;
      const observers = [];
      function startIfNeeded() {
        if (subscription) return;
        subscription = source.subscribe({
          next(value) {
            for (const observer of observers) {
              var _observer$next;
              (_observer$next = observer.next) === null || _observer$next === void 0 || _observer$next.call(observer, value);
            }
          },
          error(error) {
            for (const observer of observers) {
              var _observer$error;
              (_observer$error = observer.error) === null || _observer$error === void 0 || _observer$error.call(observer, error);
            }
          },
          complete() {
            for (const observer of observers) {
              var _observer$complete;
              (_observer$complete = observer.complete) === null || _observer$complete === void 0 || _observer$complete.call(observer);
            }
          }
        });
      }
      function resetIfNeeded() {
        if (refCount === 0 && subscription) {
          const _sub = subscription;
          subscription = null;
          _sub.unsubscribe();
        }
      }
      return observable((subscriber) => {
        refCount++;
        observers.push(subscriber);
        startIfNeeded();
        return { unsubscribe() {
          refCount--;
          resetIfNeeded();
          const index = observers.findIndex((v) => v === subscriber);
          if (index > -1) observers.splice(index, 1);
        } };
      });
    };
  }
  var distinctUnsetMarker = Symbol();
  function behaviorSubject(initialValue) {
    let value = initialValue;
    const observerList = [];
    const addObserver = (observer) => {
      if (value !== void 0) observer.next(value);
      observerList.push(observer);
    };
    const removeObserver = (observer) => {
      observerList.splice(observerList.indexOf(observer), 1);
    };
    const obs = observable((observer) => {
      addObserver(observer);
      return () => {
        removeObserver(observer);
      };
    });
    obs.next = (nextValue) => {
      if (value === nextValue) return;
      value = nextValue;
      for (const observer of observerList) observer.next(nextValue);
    };
    obs.get = () => value;
    return obs;
  }

  // node_modules/@trpc/client/dist/splitLink-B7Cuf2c_.mjs
  function createChain(opts) {
    return observable((observer) => {
      function execute(index = 0, op = opts.op) {
        const next = opts.links[index];
        if (!next) throw new Error("No more links to execute - did you forget to add an ending link?");
        const subscription = next({
          op,
          next(nextOp) {
            const nextObserver = execute(index + 1, nextOp);
            return nextObserver;
          }
        });
        return subscription;
      }
      const obs$ = execute();
      return obs$.subscribe(observer);
    });
  }
  function asArray(value) {
    return Array.isArray(value) ? value : [value];
  }
  function splitLink(opts) {
    return (runtime) => {
      const yes = asArray(opts.true).map((link) => link(runtime));
      const no = asArray(opts.false).map((link) => link(runtime));
      return (props) => {
        return observable((observer) => {
          const links = opts.condition(props.op) ? yes : no;
          return createChain({
            op: props.op,
            links
          }).subscribe(observer);
        });
      };
    };
  }

  // node_modules/@trpc/server/dist/utils-DdbbrDku.mjs
  var TRPC_ERROR_CODES_BY_KEY = {
    PARSE_ERROR: -32700,
    BAD_REQUEST: -32600,
    INTERNAL_SERVER_ERROR: -32603,
    NOT_IMPLEMENTED: -32603,
    BAD_GATEWAY: -32603,
    SERVICE_UNAVAILABLE: -32603,
    GATEWAY_TIMEOUT: -32603,
    UNAUTHORIZED: -32001,
    PAYMENT_REQUIRED: -32002,
    FORBIDDEN: -32003,
    NOT_FOUND: -32004,
    METHOD_NOT_SUPPORTED: -32005,
    TIMEOUT: -32008,
    CONFLICT: -32009,
    PRECONDITION_FAILED: -32012,
    PAYLOAD_TOO_LARGE: -32013,
    UNSUPPORTED_MEDIA_TYPE: -32015,
    UNPROCESSABLE_CONTENT: -32022,
    TOO_MANY_REQUESTS: -32029,
    CLIENT_CLOSED_REQUEST: -32099
  };
  var retryableRpcCodes = [
    TRPC_ERROR_CODES_BY_KEY.BAD_GATEWAY,
    TRPC_ERROR_CODES_BY_KEY.SERVICE_UNAVAILABLE,
    TRPC_ERROR_CODES_BY_KEY.GATEWAY_TIMEOUT,
    TRPC_ERROR_CODES_BY_KEY.INTERNAL_SERVER_ERROR
  ];
  function isObject(value) {
    return !!value && !Array.isArray(value) && typeof value === "object";
  }
  var run = (fn) => fn();
  function sleep(ms = 0) {
    return new Promise((res) => setTimeout(res, ms));
  }

  // node_modules/@trpc/server/dist/getErrorShape-Uhlrl4Bk.mjs
  var __create2 = Object.create;
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __getProtoOf2 = Object.getPrototypeOf;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __commonJS2 = (cb, mod) => function() {
    return mod || (0, cb[__getOwnPropNames2(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps2 = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames2(from), i = 0, n = keys.length, key; i < n; i++) {
      key = keys[i];
      if (!__hasOwnProp2.call(to, key) && key !== except) __defProp2(to, key, {
        get: ((k) => from[k]).bind(null, key),
        enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable
      });
    }
    return to;
  };
  var __toESM2 = (mod, isNodeMode, target) => (target = mod != null ? __create2(__getProtoOf2(mod)) : {}, __copyProps2(isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", {
    value: mod,
    enumerable: true
  }) : target, mod));
  var noop = () => {
  };
  var freezeIfAvailable = (obj) => {
    if (Object.freeze) Object.freeze(obj);
  };
  function createInnerProxy(callback, path, memo) {
    var _memo$cacheKey;
    const cacheKey = path.join(".");
    (_memo$cacheKey = memo[cacheKey]) !== null && _memo$cacheKey !== void 0 || (memo[cacheKey] = new Proxy(noop, {
      get(_obj, key) {
        if (typeof key !== "string" || key === "then") return void 0;
        return createInnerProxy(callback, [...path, key], memo);
      },
      apply(_1, _2, args) {
        const lastOfPath = path[path.length - 1];
        let opts = {
          args,
          path
        };
        if (lastOfPath === "call") opts = {
          args: args.length >= 2 ? [args[1]] : [],
          path: path.slice(0, -1)
        };
        else if (lastOfPath === "apply") opts = {
          args: args.length >= 2 ? args[1] : [],
          path: path.slice(0, -1)
        };
        freezeIfAvailable(opts.args);
        freezeIfAvailable(opts.path);
        return callback(opts);
      }
    }));
    return memo[cacheKey];
  }
  var createRecursiveProxy = (callback) => createInnerProxy(callback, [], /* @__PURE__ */ Object.create(null));
  var createFlatProxy = (callback) => {
    return new Proxy(noop, { get(_obj, name) {
      if (name === "then") return void 0;
      return callback(name);
    } });
  };
  var require_typeof2 = __commonJS2({ "../../node_modules/.pnpm/@oxc-project+runtime@0.72.2/node_modules/@oxc-project/runtime/src/helpers/typeof.js"(exports, module) {
    function _typeof$2(o) {
      "@babel/helpers - typeof";
      return module.exports = _typeof$2 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o$1) {
        return typeof o$1;
      } : function(o$1) {
        return o$1 && "function" == typeof Symbol && o$1.constructor === Symbol && o$1 !== Symbol.prototype ? "symbol" : typeof o$1;
      }, module.exports.__esModule = true, module.exports["default"] = module.exports, _typeof$2(o);
    }
    module.exports = _typeof$2, module.exports.__esModule = true, module.exports["default"] = module.exports;
  } });
  var require_toPrimitive2 = __commonJS2({ "../../node_modules/.pnpm/@oxc-project+runtime@0.72.2/node_modules/@oxc-project/runtime/src/helpers/toPrimitive.js"(exports, module) {
    var _typeof$1 = require_typeof2()["default"];
    function toPrimitive$1(t, r) {
      if ("object" != _typeof$1(t) || !t) return t;
      var e = t[Symbol.toPrimitive];
      if (void 0 !== e) {
        var i = e.call(t, r || "default");
        if ("object" != _typeof$1(i)) return i;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return ("string" === r ? String : Number)(t);
    }
    module.exports = toPrimitive$1, module.exports.__esModule = true, module.exports["default"] = module.exports;
  } });
  var require_toPropertyKey2 = __commonJS2({ "../../node_modules/.pnpm/@oxc-project+runtime@0.72.2/node_modules/@oxc-project/runtime/src/helpers/toPropertyKey.js"(exports, module) {
    var _typeof = require_typeof2()["default"];
    var toPrimitive = require_toPrimitive2();
    function toPropertyKey$1(t) {
      var i = toPrimitive(t, "string");
      return "symbol" == _typeof(i) ? i : i + "";
    }
    module.exports = toPropertyKey$1, module.exports.__esModule = true, module.exports["default"] = module.exports;
  } });
  var require_defineProperty2 = __commonJS2({ "../../node_modules/.pnpm/@oxc-project+runtime@0.72.2/node_modules/@oxc-project/runtime/src/helpers/defineProperty.js"(exports, module) {
    var toPropertyKey = require_toPropertyKey2();
    function _defineProperty(e, r, t) {
      return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
        value: t,
        enumerable: true,
        configurable: true,
        writable: true
      }) : e[r] = t, e;
    }
    module.exports = _defineProperty, module.exports.__esModule = true, module.exports["default"] = module.exports;
  } });
  var require_objectSpread22 = __commonJS2({ "../../node_modules/.pnpm/@oxc-project+runtime@0.72.2/node_modules/@oxc-project/runtime/src/helpers/objectSpread2.js"(exports, module) {
    var defineProperty = require_defineProperty2();
    function ownKeys(e, r) {
      var t = Object.keys(e);
      if (Object.getOwnPropertySymbols) {
        var o = Object.getOwnPropertySymbols(e);
        r && (o = o.filter(function(r$1) {
          return Object.getOwnPropertyDescriptor(e, r$1).enumerable;
        })), t.push.apply(t, o);
      }
      return t;
    }
    function _objectSpread2(e) {
      for (var r = 1; r < arguments.length; r++) {
        var t = null != arguments[r] ? arguments[r] : {};
        r % 2 ? ownKeys(Object(t), true).forEach(function(r$1) {
          defineProperty(e, r$1, t[r$1]);
        }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r$1) {
          Object.defineProperty(e, r$1, Object.getOwnPropertyDescriptor(t, r$1));
        });
      }
      return e;
    }
    module.exports = _objectSpread2, module.exports.__esModule = true, module.exports["default"] = module.exports;
  } });
  var import_objectSpread2 = __toESM2(require_objectSpread22(), 1);

  // node_modules/@trpc/server/dist/tracked-Bp72jHif.mjs
  var import_defineProperty = __toESM2(require_defineProperty2(), 1);
  var import_objectSpread2$1 = __toESM2(require_objectSpread22(), 1);
  function transformResultInner(response, transformer) {
    if ("error" in response) {
      const error = transformer.deserialize(response.error);
      return {
        ok: false,
        error: (0, import_objectSpread2$1.default)((0, import_objectSpread2$1.default)({}, response), {}, { error })
      };
    }
    const result = (0, import_objectSpread2$1.default)((0, import_objectSpread2$1.default)({}, response.result), (!response.result.type || response.result.type === "data") && {
      type: "data",
      data: transformer.deserialize(response.result.data)
    });
    return {
      ok: true,
      result
    };
  }
  var TransformResultError = class extends Error {
    constructor() {
      super("Unable to transform response from server");
    }
  };
  function transformResult(response, transformer) {
    let result;
    try {
      result = transformResultInner(response, transformer);
    } catch (_unused) {
      throw new TransformResultError();
    }
    if (!result.ok && (!isObject(result.error.error) || typeof result.error.error["code"] !== "number")) throw new TransformResultError();
    if (result.ok && !isObject(result.result)) throw new TransformResultError();
    return result;
  }
  var import_objectSpread22 = __toESM2(require_objectSpread22(), 1);
  var trackedSymbol = Symbol();

  // node_modules/@trpc/client/dist/TRPCClientError-CjKyS10w.mjs
  var import_defineProperty2 = __toESM(require_defineProperty(), 1);
  var import_objectSpread23 = __toESM(require_objectSpread2(), 1);
  function isTRPCClientError(cause) {
    return cause instanceof TRPCClientError;
  }
  function isTRPCErrorResponse(obj) {
    return isObject(obj) && isObject(obj["error"]) && typeof obj["error"]["code"] === "number" && typeof obj["error"]["message"] === "string";
  }
  function getMessageFromUnknownError(err, fallback) {
    if (typeof err === "string") return err;
    if (isObject(err) && typeof err["message"] === "string") return err["message"];
    return fallback;
  }
  var TRPCClientError = class TRPCClientError2 extends Error {
    constructor(message, opts) {
      var _opts$result, _opts$result2;
      const cause = opts === null || opts === void 0 ? void 0 : opts.cause;
      super(message, { cause });
      (0, import_defineProperty2.default)(this, "cause", void 0);
      (0, import_defineProperty2.default)(this, "shape", void 0);
      (0, import_defineProperty2.default)(this, "data", void 0);
      (0, import_defineProperty2.default)(this, "meta", void 0);
      this.meta = opts === null || opts === void 0 ? void 0 : opts.meta;
      this.cause = cause;
      this.shape = opts === null || opts === void 0 || (_opts$result = opts.result) === null || _opts$result === void 0 ? void 0 : _opts$result.error;
      this.data = opts === null || opts === void 0 || (_opts$result2 = opts.result) === null || _opts$result2 === void 0 ? void 0 : _opts$result2.error.data;
      this.name = "TRPCClientError";
      Object.setPrototypeOf(this, TRPCClientError2.prototype);
    }
    static from(_cause, opts = {}) {
      const cause = _cause;
      if (isTRPCClientError(cause)) {
        if (opts.meta) cause.meta = (0, import_objectSpread23.default)((0, import_objectSpread23.default)({}, cause.meta), opts.meta);
        return cause;
      }
      if (isTRPCErrorResponse(cause)) return new TRPCClientError2(cause.error.message, (0, import_objectSpread23.default)((0, import_objectSpread23.default)({}, opts), {}, { result: cause }));
      return new TRPCClientError2(getMessageFromUnknownError(cause, "Unknown error"), (0, import_objectSpread23.default)((0, import_objectSpread23.default)({}, opts), {}, { cause }));
    }
  };

  // node_modules/@trpc/client/dist/unstable-internals-Bg7n9BBj.mjs
  function getTransformer(transformer) {
    const _transformer = transformer;
    if (!_transformer) return {
      input: {
        serialize: (data) => data,
        deserialize: (data) => data
      },
      output: {
        serialize: (data) => data,
        deserialize: (data) => data
      }
    };
    if ("input" in _transformer) return _transformer;
    return {
      input: _transformer,
      output: _transformer
    };
  }

  // node_modules/@trpc/client/dist/httpUtils-Bkv1johT.mjs
  var isFunction2 = (fn) => typeof fn === "function";
  function getFetch(customFetchImpl) {
    if (customFetchImpl) return customFetchImpl;
    if (typeof window !== "undefined" && isFunction2(window.fetch)) return window.fetch;
    if (typeof globalThis !== "undefined" && isFunction2(globalThis.fetch)) return globalThis.fetch;
    throw new Error("No fetch implementation found");
  }
  var import_objectSpread24 = __toESM(require_objectSpread2(), 1);
  function resolveHTTPLinkOptions(opts) {
    return {
      url: opts.url.toString(),
      fetch: opts.fetch,
      transformer: getTransformer(opts.transformer),
      methodOverride: opts.methodOverride
    };
  }
  function arrayToDict(array) {
    const dict = {};
    for (let index = 0; index < array.length; index++) {
      const element = array[index];
      dict[index] = element;
    }
    return dict;
  }
  var METHOD = {
    query: "GET",
    mutation: "POST",
    subscription: "PATCH"
  };
  function getInput(opts) {
    return "input" in opts ? opts.transformer.input.serialize(opts.input) : arrayToDict(opts.inputs.map((_input) => opts.transformer.input.serialize(_input)));
  }
  var getUrl = (opts) => {
    const parts = opts.url.split("?");
    const base = parts[0].replace(/\/$/, "");
    let url = base + "/" + opts.path;
    const queryParts = [];
    if (parts[1]) queryParts.push(parts[1]);
    if ("inputs" in opts) queryParts.push("batch=1");
    if (opts.type === "query" || opts.type === "subscription") {
      const input = getInput(opts);
      if (input !== void 0 && opts.methodOverride !== "POST") queryParts.push(`input=${encodeURIComponent(JSON.stringify(input))}`);
    }
    if (queryParts.length) url += "?" + queryParts.join("&");
    return url;
  };
  var getBody = (opts) => {
    if (opts.type === "query" && opts.methodOverride !== "POST") return void 0;
    const input = getInput(opts);
    return input !== void 0 ? JSON.stringify(input) : void 0;
  };
  var jsonHttpRequester = (opts) => {
    return httpRequest((0, import_objectSpread24.default)((0, import_objectSpread24.default)({}, opts), {}, {
      contentTypeHeader: "application/json",
      getUrl,
      getBody
    }));
  };
  var AbortError = class extends Error {
    constructor() {
      const name = "AbortError";
      super(name);
      this.name = name;
      this.message = name;
    }
  };
  var throwIfAborted = (signal) => {
    var _signal$throwIfAborte;
    if (!(signal === null || signal === void 0 ? void 0 : signal.aborted)) return;
    (_signal$throwIfAborte = signal.throwIfAborted) === null || _signal$throwIfAborte === void 0 || _signal$throwIfAborte.call(signal);
    if (typeof DOMException !== "undefined") throw new DOMException("AbortError", "AbortError");
    throw new AbortError();
  };
  async function fetchHTTPResponse(opts) {
    var _opts$methodOverride;
    throwIfAborted(opts.signal);
    const url = opts.getUrl(opts);
    const body = opts.getBody(opts);
    const { type } = opts;
    const resolvedHeaders = await (async () => {
      const heads = await opts.headers();
      if (Symbol.iterator in heads) return Object.fromEntries(heads);
      return heads;
    })();
    const headers = (0, import_objectSpread24.default)((0, import_objectSpread24.default)((0, import_objectSpread24.default)({}, opts.contentTypeHeader ? { "content-type": opts.contentTypeHeader } : {}), opts.trpcAcceptHeader ? { "trpc-accept": opts.trpcAcceptHeader } : void 0), resolvedHeaders);
    return getFetch(opts.fetch)(url, {
      method: (_opts$methodOverride = opts.methodOverride) !== null && _opts$methodOverride !== void 0 ? _opts$methodOverride : METHOD[type],
      signal: opts.signal,
      body,
      headers
    });
  }
  async function httpRequest(opts) {
    const meta = {};
    const res = await fetchHTTPResponse(opts);
    meta.response = res;
    const json = await res.json();
    meta.responseJSON = json;
    return {
      json,
      meta
    };
  }

  // node_modules/@trpc/client/dist/httpLink-CYOcG9kQ.mjs
  var import_objectSpread25 = __toESM(require_objectSpread2(), 1);

  // node_modules/@trpc/client/dist/httpBatchLink-CA96-gnJ.mjs
  var throwFatalError = () => {
    throw new Error("Something went wrong. Please submit an issue at https://github.com/trpc/trpc/issues/new");
  };
  function dataLoader(batchLoader) {
    let pendingItems = null;
    let dispatchTimer = null;
    const destroyTimerAndPendingItems = () => {
      clearTimeout(dispatchTimer);
      dispatchTimer = null;
      pendingItems = null;
    };
    function groupItems(items) {
      const groupedItems = [[]];
      let index = 0;
      while (true) {
        const item = items[index];
        if (!item) break;
        const lastGroup = groupedItems[groupedItems.length - 1];
        if (item.aborted) {
          var _item$reject;
          (_item$reject = item.reject) === null || _item$reject === void 0 || _item$reject.call(item, new Error("Aborted"));
          index++;
          continue;
        }
        const isValid = batchLoader.validate(lastGroup.concat(item).map((it) => it.key));
        if (isValid) {
          lastGroup.push(item);
          index++;
          continue;
        }
        if (lastGroup.length === 0) {
          var _item$reject2;
          (_item$reject2 = item.reject) === null || _item$reject2 === void 0 || _item$reject2.call(item, new Error("Input is too big for a single dispatch"));
          index++;
          continue;
        }
        groupedItems.push([]);
      }
      return groupedItems;
    }
    function dispatch() {
      const groupedItems = groupItems(pendingItems);
      destroyTimerAndPendingItems();
      for (const items of groupedItems) {
        if (!items.length) continue;
        const batch = { items };
        for (const item of items) item.batch = batch;
        const promise = batchLoader.fetch(batch.items.map((_item) => _item.key));
        promise.then(async (result) => {
          await Promise.all(result.map(async (valueOrPromise, index) => {
            const item = batch.items[index];
            try {
              var _item$resolve;
              const value = await Promise.resolve(valueOrPromise);
              (_item$resolve = item.resolve) === null || _item$resolve === void 0 || _item$resolve.call(item, value);
            } catch (cause) {
              var _item$reject3;
              (_item$reject3 = item.reject) === null || _item$reject3 === void 0 || _item$reject3.call(item, cause);
            }
            item.batch = null;
            item.reject = null;
            item.resolve = null;
          }));
          for (const item of batch.items) {
            var _item$reject4;
            (_item$reject4 = item.reject) === null || _item$reject4 === void 0 || _item$reject4.call(item, new Error("Missing result"));
            item.batch = null;
          }
        }).catch((cause) => {
          for (const item of batch.items) {
            var _item$reject5;
            (_item$reject5 = item.reject) === null || _item$reject5 === void 0 || _item$reject5.call(item, cause);
            item.batch = null;
          }
        });
      }
    }
    function load(key) {
      var _dispatchTimer;
      const item = {
        aborted: false,
        key,
        batch: null,
        resolve: throwFatalError,
        reject: throwFatalError
      };
      const promise = new Promise((resolve, reject) => {
        var _pendingItems;
        item.reject = reject;
        item.resolve = resolve;
        (_pendingItems = pendingItems) !== null && _pendingItems !== void 0 || (pendingItems = []);
        pendingItems.push(item);
      });
      (_dispatchTimer = dispatchTimer) !== null && _dispatchTimer !== void 0 || (dispatchTimer = setTimeout(dispatch));
      return promise;
    }
    return { load };
  }
  function allAbortSignals(...signals) {
    const ac = new AbortController();
    const count = signals.length;
    let abortedCount = 0;
    const onAbort = () => {
      if (++abortedCount === count) ac.abort();
    };
    for (const signal of signals) if (signal === null || signal === void 0 ? void 0 : signal.aborted) onAbort();
    else signal === null || signal === void 0 || signal.addEventListener("abort", onAbort, { once: true });
    return ac.signal;
  }
  var import_objectSpread26 = __toESM(require_objectSpread2(), 1);
  function httpBatchLink(opts) {
    var _opts$maxURLLength, _opts$maxItems;
    const resolvedOpts = resolveHTTPLinkOptions(opts);
    const maxURLLength = (_opts$maxURLLength = opts.maxURLLength) !== null && _opts$maxURLLength !== void 0 ? _opts$maxURLLength : Infinity;
    const maxItems = (_opts$maxItems = opts.maxItems) !== null && _opts$maxItems !== void 0 ? _opts$maxItems : Infinity;
    return () => {
      const batchLoader = (type) => {
        return {
          validate(batchOps) {
            if (maxURLLength === Infinity && maxItems === Infinity) return true;
            if (batchOps.length > maxItems) return false;
            const path = batchOps.map((op) => op.path).join(",");
            const inputs = batchOps.map((op) => op.input);
            const url = getUrl((0, import_objectSpread26.default)((0, import_objectSpread26.default)({}, resolvedOpts), {}, {
              type,
              path,
              inputs,
              signal: null
            }));
            return url.length <= maxURLLength;
          },
          async fetch(batchOps) {
            const path = batchOps.map((op) => op.path).join(",");
            const inputs = batchOps.map((op) => op.input);
            const signal = allAbortSignals(...batchOps.map((op) => op.signal));
            const res = await jsonHttpRequester((0, import_objectSpread26.default)((0, import_objectSpread26.default)({}, resolvedOpts), {}, {
              path,
              inputs,
              type,
              headers() {
                if (!opts.headers) return {};
                if (typeof opts.headers === "function") return opts.headers({ opList: batchOps });
                return opts.headers;
              },
              signal
            }));
            const resJSON = Array.isArray(res.json) ? res.json : batchOps.map(() => res.json);
            const result = resJSON.map((item) => ({
              meta: res.meta,
              json: item
            }));
            return result;
          }
        };
      };
      const query = dataLoader(batchLoader("query"));
      const mutation = dataLoader(batchLoader("mutation"));
      const loaders = {
        query,
        mutation
      };
      return ({ op }) => {
        return observable((observer) => {
          if (op.type === "subscription") throw new Error("Subscriptions are unsupported by `httpLink` - use `httpSubscriptionLink` or `wsLink`");
          const loader = loaders[op.type];
          const promise = loader.load(op);
          let _res = void 0;
          promise.then((res) => {
            _res = res;
            const transformed = transformResult(res.json, resolvedOpts.transformer.output);
            if (!transformed.ok) {
              observer.error(TRPCClientError.from(transformed.error, { meta: res.meta }));
              return;
            }
            observer.next({
              context: res.meta,
              result: transformed.result
            });
            observer.complete();
          }).catch((err) => {
            observer.error(TRPCClientError.from(err, { meta: _res === null || _res === void 0 ? void 0 : _res.meta }));
          });
          return () => {
          };
        });
      };
    };
  }

  // node_modules/@trpc/client/dist/loggerLink-ineCN1PO.mjs
  var import_objectSpread27 = __toESM(require_objectSpread2(), 1);

  // node_modules/@trpc/client/dist/wsLink-H5IjZfJW.mjs
  var lazyDefaults = {
    enabled: false,
    closeMs: 0
  };
  var keepAliveDefaults = {
    enabled: false,
    pongTimeoutMs: 1e3,
    intervalMs: 5e3
  };
  var exponentialBackoff = (attemptIndex) => {
    return attemptIndex === 0 ? 0 : Math.min(1e3 * 2 ** attemptIndex, 3e4);
  };
  var resultOf = (value, ...args) => {
    return typeof value === "function" ? value(...args) : value;
  };
  var import_defineProperty$3 = __toESM(require_defineProperty(), 1);
  var TRPCWebSocketClosedError = class TRPCWebSocketClosedError2 extends Error {
    constructor(opts) {
      super(opts.message, { cause: opts.cause });
      this.name = "TRPCWebSocketClosedError";
      Object.setPrototypeOf(this, TRPCWebSocketClosedError2.prototype);
    }
  };
  var ResettableTimeout = class {
    constructor(onTimeout, timeoutMs) {
      this.onTimeout = onTimeout;
      this.timeoutMs = timeoutMs;
      (0, import_defineProperty$3.default)(this, "timeout", void 0);
    }
    /**
    * Resets the current timeout, restarting it with the same duration.
    * Does nothing if no timeout is active.
    */
    reset() {
      if (!this.timeout) return;
      clearTimeout(this.timeout);
      this.timeout = setTimeout(this.onTimeout, this.timeoutMs);
    }
    start() {
      clearTimeout(this.timeout);
      this.timeout = setTimeout(this.onTimeout, this.timeoutMs);
    }
    stop() {
      clearTimeout(this.timeout);
      this.timeout = void 0;
    }
  };
  function withResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return {
      promise,
      resolve,
      reject
    };
  }
  async function prepareUrl(urlOptions) {
    const url = await resultOf(urlOptions.url);
    if (!urlOptions.connectionParams) return url;
    const prefix = url.includes("?") ? "&" : "?";
    const connectionParams = `${prefix}connectionParams=1`;
    return url + connectionParams;
  }
  async function buildConnectionMessage(connectionParams) {
    const message = {
      method: "connectionParams",
      data: await resultOf(connectionParams)
    };
    return JSON.stringify(message);
  }
  var import_defineProperty$2 = __toESM(require_defineProperty(), 1);
  var RequestManager = class {
    constructor() {
      (0, import_defineProperty$2.default)(this, "outgoingRequests", new Array());
      (0, import_defineProperty$2.default)(this, "pendingRequests", {});
    }
    /**
    * Registers a new request by adding it to the outgoing queue and setting up
    * callbacks for lifecycle events such as completion or error.
    *
    * @param message - The outgoing message to be sent.
    * @param callbacks - Callback functions to observe the request's state.
    * @returns A cleanup function to manually remove the request.
    */
    register(message, callbacks) {
      const { promise: end, resolve } = withResolvers();
      this.outgoingRequests.push({
        id: String(message.id),
        message,
        end,
        callbacks: {
          next: callbacks.next,
          complete: () => {
            callbacks.complete();
            resolve();
          },
          error: (e) => {
            callbacks.error(e);
            resolve();
          }
        }
      });
      return () => {
        this.delete(message.id);
        callbacks.complete();
        resolve();
      };
    }
    /**
    * Deletes a request from both the outgoing and pending collections, if it exists.
    */
    delete(messageId) {
      if (messageId === null) return;
      this.outgoingRequests = this.outgoingRequests.filter(({ id }) => id !== String(messageId));
      delete this.pendingRequests[String(messageId)];
    }
    /**
    * Moves all outgoing requests to the pending state and clears the outgoing queue.
    *
    * The caller is expected to handle the actual sending of the requests
    * (e.g., sending them over the network) after this method is called.
    *
    * @returns The list of requests that were transitioned to the pending state.
    */
    flush() {
      const requests = this.outgoingRequests;
      this.outgoingRequests = [];
      for (const request of requests) this.pendingRequests[request.id] = request;
      return requests;
    }
    /**
    * Retrieves all currently pending requests, which are in flight awaiting responses
    * or handling ongoing subscriptions.
    */
    getPendingRequests() {
      return Object.values(this.pendingRequests);
    }
    /**
    * Retrieves a specific pending request by its message ID.
    */
    getPendingRequest(messageId) {
      if (messageId === null) return null;
      return this.pendingRequests[String(messageId)];
    }
    /**
    * Retrieves all outgoing requests, which are waiting to be sent.
    */
    getOutgoingRequests() {
      return this.outgoingRequests;
    }
    /**
    * Retrieves all requests, both outgoing and pending, with their respective states.
    *
    * @returns An array of all requests with their state ("outgoing" or "pending").
    */
    getRequests() {
      return [...this.getOutgoingRequests().map((request) => ({
        state: "outgoing",
        message: request.message,
        end: request.end,
        callbacks: request.callbacks
      })), ...this.getPendingRequests().map((request) => ({
        state: "pending",
        message: request.message,
        end: request.end,
        callbacks: request.callbacks
      }))];
    }
    /**
    * Checks if there are any pending requests, including ongoing subscriptions.
    */
    hasPendingRequests() {
      return this.getPendingRequests().length > 0;
    }
    /**
    * Checks if there are any pending subscriptions
    */
    hasPendingSubscriptions() {
      return this.getPendingRequests().some((request) => request.message.method === "subscription");
    }
    /**
    * Checks if there are any outgoing requests waiting to be sent.
    */
    hasOutgoingRequests() {
      return this.outgoingRequests.length > 0;
    }
  };
  var import_defineProperty$1 = __toESM(require_defineProperty(), 1);
  function asyncWsOpen(ws) {
    const { promise, resolve, reject } = withResolvers();
    ws.addEventListener("open", () => {
      ws.removeEventListener("error", reject);
      resolve();
    });
    ws.addEventListener("error", reject);
    return promise;
  }
  function setupPingInterval(ws, { intervalMs, pongTimeoutMs }) {
    let pingTimeout;
    let pongTimeout;
    function start() {
      pingTimeout = setTimeout(() => {
        ws.send("PING");
        pongTimeout = setTimeout(() => {
          ws.close();
        }, pongTimeoutMs);
      }, intervalMs);
    }
    function reset() {
      clearTimeout(pingTimeout);
      start();
    }
    function pong() {
      clearTimeout(pongTimeout);
      reset();
    }
    ws.addEventListener("open", start);
    ws.addEventListener("message", ({ data }) => {
      clearTimeout(pingTimeout);
      start();
      if (data === "PONG") pong();
    });
    ws.addEventListener("close", () => {
      clearTimeout(pingTimeout);
      clearTimeout(pongTimeout);
    });
  }
  var WsConnection = class WsConnection2 {
    constructor(opts) {
      var _opts$WebSocketPonyfi;
      (0, import_defineProperty$1.default)(this, "id", ++WsConnection2.connectCount);
      (0, import_defineProperty$1.default)(this, "WebSocketPonyfill", void 0);
      (0, import_defineProperty$1.default)(this, "urlOptions", void 0);
      (0, import_defineProperty$1.default)(this, "keepAliveOpts", void 0);
      (0, import_defineProperty$1.default)(this, "wsObservable", behaviorSubject(null));
      (0, import_defineProperty$1.default)(this, "openPromise", null);
      this.WebSocketPonyfill = (_opts$WebSocketPonyfi = opts.WebSocketPonyfill) !== null && _opts$WebSocketPonyfi !== void 0 ? _opts$WebSocketPonyfi : WebSocket;
      if (!this.WebSocketPonyfill) throw new Error("No WebSocket implementation found - you probably don't want to use this on the server, but if you do you need to pass a `WebSocket`-ponyfill");
      this.urlOptions = opts.urlOptions;
      this.keepAliveOpts = opts.keepAlive;
    }
    get ws() {
      return this.wsObservable.get();
    }
    set ws(ws) {
      this.wsObservable.next(ws);
    }
    /**
    * Checks if the WebSocket connection is open and ready to communicate.
    */
    isOpen() {
      return !!this.ws && this.ws.readyState === this.WebSocketPonyfill.OPEN && !this.openPromise;
    }
    /**
    * Checks if the WebSocket connection is closed or in the process of closing.
    */
    isClosed() {
      return !!this.ws && (this.ws.readyState === this.WebSocketPonyfill.CLOSING || this.ws.readyState === this.WebSocketPonyfill.CLOSED);
    }
    async open() {
      var _this = this;
      if (_this.openPromise) return _this.openPromise;
      _this.id = ++WsConnection2.connectCount;
      const wsPromise = prepareUrl(_this.urlOptions).then((url) => new _this.WebSocketPonyfill(url));
      _this.openPromise = wsPromise.then(async (ws) => {
        _this.ws = ws;
        ws.addEventListener("message", function({ data }) {
          if (data === "PING") this.send("PONG");
        });
        if (_this.keepAliveOpts.enabled) setupPingInterval(ws, _this.keepAliveOpts);
        ws.addEventListener("close", () => {
          if (_this.ws === ws) _this.ws = null;
        });
        await asyncWsOpen(ws);
        if (_this.urlOptions.connectionParams) ws.send(await buildConnectionMessage(_this.urlOptions.connectionParams));
      });
      try {
        await _this.openPromise;
      } finally {
        _this.openPromise = null;
      }
    }
    /**
    * Closes the WebSocket connection gracefully.
    * Waits for any ongoing open operation to complete before closing.
    */
    async close() {
      var _this2 = this;
      try {
        await _this2.openPromise;
      } finally {
        var _this$ws;
        (_this$ws = _this2.ws) === null || _this$ws === void 0 || _this$ws.close();
      }
    }
  };
  (0, import_defineProperty$1.default)(WsConnection, "connectCount", 0);
  function backwardCompatibility(connection) {
    if (connection.isOpen()) return {
      id: connection.id,
      state: "open",
      ws: connection.ws
    };
    if (connection.isClosed()) return {
      id: connection.id,
      state: "closed",
      ws: connection.ws
    };
    if (!connection.ws) return null;
    return {
      id: connection.id,
      state: "connecting",
      ws: connection.ws
    };
  }
  var import_defineProperty3 = __toESM(require_defineProperty(), 1);
  var import_objectSpread28 = __toESM(require_objectSpread2(), 1);
  var WsClient = class {
    constructor(opts) {
      var _opts$retryDelayMs;
      (0, import_defineProperty3.default)(this, "connectionState", void 0);
      (0, import_defineProperty3.default)(this, "allowReconnect", false);
      (0, import_defineProperty3.default)(this, "requestManager", new RequestManager());
      (0, import_defineProperty3.default)(this, "activeConnection", void 0);
      (0, import_defineProperty3.default)(this, "reconnectRetryDelay", void 0);
      (0, import_defineProperty3.default)(this, "inactivityTimeout", void 0);
      (0, import_defineProperty3.default)(this, "callbacks", void 0);
      (0, import_defineProperty3.default)(this, "lazyMode", void 0);
      (0, import_defineProperty3.default)(this, "reconnecting", null);
      this.callbacks = {
        onOpen: opts.onOpen,
        onClose: opts.onClose,
        onError: opts.onError
      };
      const lazyOptions = (0, import_objectSpread28.default)((0, import_objectSpread28.default)({}, lazyDefaults), opts.lazy);
      this.inactivityTimeout = new ResettableTimeout(() => {
        if (this.requestManager.hasOutgoingRequests() || this.requestManager.hasPendingRequests()) {
          this.inactivityTimeout.reset();
          return;
        }
        this.close().catch(() => null);
      }, lazyOptions.closeMs);
      this.activeConnection = new WsConnection({
        WebSocketPonyfill: opts.WebSocket,
        urlOptions: opts,
        keepAlive: (0, import_objectSpread28.default)((0, import_objectSpread28.default)({}, keepAliveDefaults), opts.keepAlive)
      });
      this.activeConnection.wsObservable.subscribe({ next: (ws) => {
        if (!ws) return;
        this.setupWebSocketListeners(ws);
      } });
      this.reconnectRetryDelay = (_opts$retryDelayMs = opts.retryDelayMs) !== null && _opts$retryDelayMs !== void 0 ? _opts$retryDelayMs : exponentialBackoff;
      this.lazyMode = lazyOptions.enabled;
      this.connectionState = behaviorSubject({
        type: "state",
        state: lazyOptions.enabled ? "idle" : "connecting",
        error: null
      });
      if (!this.lazyMode) this.open().catch(() => null);
    }
    /**
    * Opens the WebSocket connection. Handles reconnection attempts and updates
    * the connection state accordingly.
    */
    async open() {
      var _this = this;
      _this.allowReconnect = true;
      if (_this.connectionState.get().state !== "connecting") _this.connectionState.next({
        type: "state",
        state: "connecting",
        error: null
      });
      try {
        await _this.activeConnection.open();
      } catch (error) {
        _this.reconnect(new TRPCWebSocketClosedError({
          message: "Initialization error",
          cause: error
        }));
        return _this.reconnecting;
      }
    }
    /**
    * Closes the WebSocket connection and stops managing requests.
    * Ensures all outgoing and pending requests are properly finalized.
    */
    async close() {
      var _this2 = this;
      _this2.allowReconnect = false;
      _this2.inactivityTimeout.stop();
      const requestsToAwait = [];
      for (const request of _this2.requestManager.getRequests()) if (request.message.method === "subscription") request.callbacks.complete();
      else if (request.state === "outgoing") request.callbacks.error(TRPCClientError.from(new TRPCWebSocketClosedError({ message: "Closed before connection was established" })));
      else requestsToAwait.push(request.end);
      await Promise.all(requestsToAwait).catch(() => null);
      await _this2.activeConnection.close().catch(() => null);
      _this2.connectionState.next({
        type: "state",
        state: "idle",
        error: null
      });
    }
    /**
    * Method to request the server.
    * Handles data transformation, batching of requests, and subscription lifecycle.
    *
    * @param op - The operation details including id, type, path, input and signal
    * @param transformer - Data transformer for serializing requests and deserializing responses
    * @param lastEventId - Optional ID of the last received event for subscriptions
    *
    * @returns An observable that emits operation results and handles cleanup
    */
    request({ op: { id, type, path, input, signal }, transformer, lastEventId }) {
      return observable((observer) => {
        const abort = this.batchSend({
          id,
          method: type,
          params: {
            input: transformer.input.serialize(input),
            path,
            lastEventId
          }
        }, (0, import_objectSpread28.default)((0, import_objectSpread28.default)({}, observer), {}, { next(event) {
          const transformed = transformResult(event, transformer.output);
          if (!transformed.ok) {
            observer.error(TRPCClientError.from(transformed.error));
            return;
          }
          observer.next({ result: transformed.result });
        } }));
        return () => {
          abort();
          if (type === "subscription" && this.activeConnection.isOpen()) this.send({
            id,
            method: "subscription.stop"
          });
          signal === null || signal === void 0 || signal.removeEventListener("abort", abort);
        };
      });
    }
    get connection() {
      return backwardCompatibility(this.activeConnection);
    }
    reconnect(closedError) {
      var _this3 = this;
      this.connectionState.next({
        type: "state",
        state: "connecting",
        error: TRPCClientError.from(closedError)
      });
      if (this.reconnecting) return;
      const tryReconnect = async (attemptIndex) => {
        try {
          await sleep(_this3.reconnectRetryDelay(attemptIndex));
          if (_this3.allowReconnect) {
            await _this3.activeConnection.close();
            await _this3.activeConnection.open();
            if (_this3.requestManager.hasPendingRequests()) _this3.send(_this3.requestManager.getPendingRequests().map(({ message }) => message));
          }
          _this3.reconnecting = null;
        } catch (_unused) {
          await tryReconnect(attemptIndex + 1);
        }
      };
      this.reconnecting = tryReconnect(0);
    }
    setupWebSocketListeners(ws) {
      var _this4 = this;
      const handleCloseOrError = (cause) => {
        const reqs = this.requestManager.getPendingRequests();
        for (const { message, callbacks } of reqs) {
          if (message.method === "subscription") continue;
          callbacks.error(TRPCClientError.from(cause !== null && cause !== void 0 ? cause : new TRPCWebSocketClosedError({
            message: "WebSocket closed",
            cause
          })));
          this.requestManager.delete(message.id);
        }
      };
      ws.addEventListener("open", () => {
        run(async () => {
          var _this$callbacks$onOpe, _this$callbacks;
          if (_this4.lazyMode) _this4.inactivityTimeout.start();
          (_this$callbacks$onOpe = (_this$callbacks = _this4.callbacks).onOpen) === null || _this$callbacks$onOpe === void 0 || _this$callbacks$onOpe.call(_this$callbacks);
          _this4.connectionState.next({
            type: "state",
            state: "pending",
            error: null
          });
        }).catch((error) => {
          ws.close(3e3);
          handleCloseOrError(error);
        });
      });
      ws.addEventListener("message", ({ data }) => {
        this.inactivityTimeout.reset();
        if (typeof data !== "string" || ["PING", "PONG"].includes(data)) return;
        const incomingMessage = JSON.parse(data);
        if ("method" in incomingMessage) {
          this.handleIncomingRequest(incomingMessage);
          return;
        }
        this.handleResponseMessage(incomingMessage);
      });
      ws.addEventListener("close", (event) => {
        var _this$callbacks$onClo, _this$callbacks2;
        handleCloseOrError(event);
        (_this$callbacks$onClo = (_this$callbacks2 = this.callbacks).onClose) === null || _this$callbacks$onClo === void 0 || _this$callbacks$onClo.call(_this$callbacks2, event);
        if (!this.lazyMode || this.requestManager.hasPendingSubscriptions()) this.reconnect(new TRPCWebSocketClosedError({
          message: "WebSocket closed",
          cause: event
        }));
      });
      ws.addEventListener("error", (event) => {
        var _this$callbacks$onErr, _this$callbacks3;
        handleCloseOrError(event);
        (_this$callbacks$onErr = (_this$callbacks3 = this.callbacks).onError) === null || _this$callbacks$onErr === void 0 || _this$callbacks$onErr.call(_this$callbacks3, event);
        this.reconnect(new TRPCWebSocketClosedError({
          message: "WebSocket closed",
          cause: event
        }));
      });
    }
    handleResponseMessage(message) {
      const request = this.requestManager.getPendingRequest(message.id);
      if (!request) return;
      request.callbacks.next(message);
      let completed = true;
      if ("result" in message && request.message.method === "subscription") {
        if (message.result.type === "data") request.message.params.lastEventId = message.result.id;
        if (message.result.type !== "stopped") completed = false;
      }
      if (completed) {
        request.callbacks.complete();
        this.requestManager.delete(message.id);
      }
    }
    handleIncomingRequest(message) {
      if (message.method === "reconnect") this.reconnect(new TRPCWebSocketClosedError({ message: "Server requested reconnect" }));
    }
    /**
    * Sends a message or batch of messages directly to the server.
    */
    send(messageOrMessages) {
      if (!this.activeConnection.isOpen()) throw new Error("Active connection is not open");
      const messages = messageOrMessages instanceof Array ? messageOrMessages : [messageOrMessages];
      this.activeConnection.ws.send(JSON.stringify(messages.length === 1 ? messages[0] : messages));
    }
    /**
    * Groups requests for batch sending.
    *
    * @returns A function to abort the batched request.
    */
    batchSend(message, callbacks) {
      var _this5 = this;
      this.inactivityTimeout.reset();
      run(async () => {
        if (!_this5.activeConnection.isOpen()) await _this5.open();
        await sleep(0);
        if (!_this5.requestManager.hasOutgoingRequests()) return;
        _this5.send(_this5.requestManager.flush().map(({ message: message$1 }) => message$1));
      }).catch((err) => {
        this.requestManager.delete(message.id);
        callbacks.error(TRPCClientError.from(err));
      });
      return this.requestManager.register(message, callbacks);
    }
  };
  function createWSClient(opts) {
    return new WsClient(opts);
  }
  function wsLink(opts) {
    const { client } = opts;
    const transformer = getTransformer(opts.transformer);
    return () => {
      return ({ op }) => {
        return observable((observer) => {
          const connStateSubscription = op.type === "subscription" ? client.connectionState.subscribe({ next(result) {
            observer.next({
              result,
              context: op.context
            });
          } }) : null;
          const requestSubscription = client.request({
            op,
            transformer
          }).subscribe(observer);
          return () => {
            requestSubscription.unsubscribe();
            connStateSubscription === null || connStateSubscription === void 0 || connStateSubscription.unsubscribe();
          };
        });
      };
    };
  }

  // node_modules/@trpc/client/dist/index.mjs
  var import_defineProperty4 = __toESM(require_defineProperty(), 1);
  var import_objectSpread2$4 = __toESM(require_objectSpread2(), 1);
  var TRPCUntypedClient = class {
    constructor(opts) {
      (0, import_defineProperty4.default)(this, "links", void 0);
      (0, import_defineProperty4.default)(this, "runtime", void 0);
      (0, import_defineProperty4.default)(this, "requestId", void 0);
      this.requestId = 0;
      this.runtime = {};
      this.links = opts.links.map((link) => link(this.runtime));
    }
    $request(opts) {
      var _opts$context;
      const chain$ = createChain({
        links: this.links,
        op: (0, import_objectSpread2$4.default)((0, import_objectSpread2$4.default)({}, opts), {}, {
          context: (_opts$context = opts.context) !== null && _opts$context !== void 0 ? _opts$context : {},
          id: ++this.requestId
        })
      });
      return chain$.pipe(share());
    }
    async requestAsPromise(opts) {
      var _this = this;
      try {
        const req$ = _this.$request(opts);
        const envelope = await observableToPromise(req$);
        const data = envelope.result.data;
        return data;
      } catch (err) {
        throw TRPCClientError.from(err);
      }
    }
    query(path, input, opts) {
      return this.requestAsPromise({
        type: "query",
        path,
        input,
        context: opts === null || opts === void 0 ? void 0 : opts.context,
        signal: opts === null || opts === void 0 ? void 0 : opts.signal
      });
    }
    mutation(path, input, opts) {
      return this.requestAsPromise({
        type: "mutation",
        path,
        input,
        context: opts === null || opts === void 0 ? void 0 : opts.context,
        signal: opts === null || opts === void 0 ? void 0 : opts.signal
      });
    }
    subscription(path, input, opts) {
      const observable$ = this.$request({
        type: "subscription",
        path,
        input,
        context: opts.context,
        signal: opts.signal
      });
      return observable$.subscribe({
        next(envelope) {
          switch (envelope.result.type) {
            case "state": {
              var _opts$onConnectionSta;
              (_opts$onConnectionSta = opts.onConnectionStateChange) === null || _opts$onConnectionSta === void 0 || _opts$onConnectionSta.call(opts, envelope.result);
              break;
            }
            case "started": {
              var _opts$onStarted;
              (_opts$onStarted = opts.onStarted) === null || _opts$onStarted === void 0 || _opts$onStarted.call(opts, { context: envelope.context });
              break;
            }
            case "stopped": {
              var _opts$onStopped;
              (_opts$onStopped = opts.onStopped) === null || _opts$onStopped === void 0 || _opts$onStopped.call(opts);
              break;
            }
            case "data":
            case void 0: {
              var _opts$onData;
              (_opts$onData = opts.onData) === null || _opts$onData === void 0 || _opts$onData.call(opts, envelope.result.data);
              break;
            }
          }
        },
        error(err) {
          var _opts$onError;
          (_opts$onError = opts.onError) === null || _opts$onError === void 0 || _opts$onError.call(opts, err);
        },
        complete() {
          var _opts$onComplete;
          (_opts$onComplete = opts.onComplete) === null || _opts$onComplete === void 0 || _opts$onComplete.call(opts);
        }
      });
    }
  };
  var untypedClientSymbol = Symbol.for("trpc_untypedClient");
  var clientCallTypeMap = {
    query: "query",
    mutate: "mutation",
    subscribe: "subscription"
  };
  var clientCallTypeToProcedureType = (clientCallType) => {
    return clientCallTypeMap[clientCallType];
  };
  function createTRPCClientProxy(client) {
    const proxy = createRecursiveProxy(({ path, args }) => {
      const pathCopy = [...path];
      const procedureType = clientCallTypeToProcedureType(pathCopy.pop());
      const fullPath = pathCopy.join(".");
      return client[procedureType](fullPath, ...args);
    });
    return createFlatProxy((key) => {
      if (key === untypedClientSymbol) return client;
      return proxy[key];
    });
  }
  function createTRPCClient(opts) {
    const client = new TRPCUntypedClient(opts);
    const proxy = createTRPCClientProxy(client);
    return proxy;
  }
  var import_objectSpread2$3 = __toESM(require_objectSpread2(), 1);
  var import_objectSpread2$2 = __toESM(require_objectSpread2(), 1);
  var require_asyncIterator = __commonJS({ "../../node_modules/.pnpm/@oxc-project+runtime@0.72.2/node_modules/@oxc-project/runtime/src/helpers/asyncIterator.js"(exports, module) {
    function _asyncIterator$1(r) {
      var n, t, o, e = 2;
      for ("undefined" != typeof Symbol && (t = Symbol.asyncIterator, o = Symbol.iterator); e--; ) {
        if (t && null != (n = r[t])) return n.call(r);
        if (o && null != (n = r[o])) return new AsyncFromSyncIterator(n.call(r));
        t = "@@asyncIterator", o = "@@iterator";
      }
      throw new TypeError("Object is not async iterable");
    }
    function AsyncFromSyncIterator(r) {
      function AsyncFromSyncIteratorContinuation(r$1) {
        if (Object(r$1) !== r$1) return Promise.reject(new TypeError(r$1 + " is not an object."));
        var n = r$1.done;
        return Promise.resolve(r$1.value).then(function(r$2) {
          return {
            value: r$2,
            done: n
          };
        });
      }
      return AsyncFromSyncIterator = function AsyncFromSyncIterator$1(r$1) {
        this.s = r$1, this.n = r$1.next;
      }, AsyncFromSyncIterator.prototype = {
        s: null,
        n: null,
        next: function next() {
          return AsyncFromSyncIteratorContinuation(this.n.apply(this.s, arguments));
        },
        "return": function _return(r$1) {
          var n = this.s["return"];
          return void 0 === n ? Promise.resolve({
            value: r$1,
            done: true
          }) : AsyncFromSyncIteratorContinuation(n.apply(this.s, arguments));
        },
        "throw": function _throw(r$1) {
          var n = this.s["return"];
          return void 0 === n ? Promise.reject(r$1) : AsyncFromSyncIteratorContinuation(n.apply(this.s, arguments));
        }
      }, new AsyncFromSyncIterator(r);
    }
    module.exports = _asyncIterator$1, module.exports.__esModule = true, module.exports["default"] = module.exports;
  } });
  var import_asyncIterator = __toESM(require_asyncIterator(), 1);
  var import_objectSpread2$12 = __toESM(require_objectSpread2(), 1);
  var require_usingCtx = __commonJS({ "../../node_modules/.pnpm/@oxc-project+runtime@0.72.2/node_modules/@oxc-project/runtime/src/helpers/usingCtx.js"(exports, module) {
    function _usingCtx() {
      var r = "function" == typeof SuppressedError ? SuppressedError : function(r$1, e$1) {
        var n$1 = Error();
        return n$1.name = "SuppressedError", n$1.error = r$1, n$1.suppressed = e$1, n$1;
      }, e = {}, n = [];
      function using(r$1, e$1) {
        if (null != e$1) {
          if (Object(e$1) !== e$1) throw new TypeError("using declarations can only be used with objects, functions, null, or undefined.");
          if (r$1) var o = e$1[Symbol.asyncDispose || Symbol["for"]("Symbol.asyncDispose")];
          if (void 0 === o && (o = e$1[Symbol.dispose || Symbol["for"]("Symbol.dispose")], r$1)) var t = o;
          if ("function" != typeof o) throw new TypeError("Object is not disposable.");
          t && (o = function o$1() {
            try {
              t.call(e$1);
            } catch (r$2) {
              return Promise.reject(r$2);
            }
          }), n.push({
            v: e$1,
            d: o,
            a: r$1
          });
        } else r$1 && n.push({
          d: e$1,
          a: r$1
        });
        return e$1;
      }
      return {
        e,
        u: using.bind(null, false),
        a: using.bind(null, true),
        d: function d() {
          var o, t = this.e, s = 0;
          function next() {
            for (; o = n.pop(); ) try {
              if (!o.a && 1 === s) return s = 0, n.push(o), Promise.resolve().then(next);
              if (o.d) {
                var r$1 = o.d.call(o.v);
                if (o.a) return s |= 2, Promise.resolve(r$1).then(next, err);
              } else s |= 1;
            } catch (r$2) {
              return err(r$2);
            }
            if (1 === s) return t !== e ? Promise.reject(t) : Promise.resolve();
            if (t !== e) throw t;
          }
          function err(n$1) {
            return t = t !== e ? new r(n$1, t) : n$1, next();
          }
          return next();
        }
      };
    }
    module.exports = _usingCtx, module.exports.__esModule = true, module.exports["default"] = module.exports;
  } });
  var require_OverloadYield = __commonJS({ "../../node_modules/.pnpm/@oxc-project+runtime@0.72.2/node_modules/@oxc-project/runtime/src/helpers/OverloadYield.js"(exports, module) {
    function _OverloadYield(e, d) {
      this.v = e, this.k = d;
    }
    module.exports = _OverloadYield, module.exports.__esModule = true, module.exports["default"] = module.exports;
  } });
  var require_awaitAsyncGenerator = __commonJS({ "../../node_modules/.pnpm/@oxc-project+runtime@0.72.2/node_modules/@oxc-project/runtime/src/helpers/awaitAsyncGenerator.js"(exports, module) {
    var OverloadYield$1 = require_OverloadYield();
    function _awaitAsyncGenerator$1(e) {
      return new OverloadYield$1(e, 0);
    }
    module.exports = _awaitAsyncGenerator$1, module.exports.__esModule = true, module.exports["default"] = module.exports;
  } });
  var require_wrapAsyncGenerator = __commonJS({ "../../node_modules/.pnpm/@oxc-project+runtime@0.72.2/node_modules/@oxc-project/runtime/src/helpers/wrapAsyncGenerator.js"(exports, module) {
    var OverloadYield = require_OverloadYield();
    function _wrapAsyncGenerator$1(e) {
      return function() {
        return new AsyncGenerator(e.apply(this, arguments));
      };
    }
    function AsyncGenerator(e) {
      var r, t;
      function resume(r$1, t$1) {
        try {
          var n = e[r$1](t$1), o = n.value, u = o instanceof OverloadYield;
          Promise.resolve(u ? o.v : o).then(function(t$2) {
            if (u) {
              var i = "return" === r$1 ? "return" : "next";
              if (!o.k || t$2.done) return resume(i, t$2);
              t$2 = e[i](t$2).value;
            }
            settle(n.done ? "return" : "normal", t$2);
          }, function(e$1) {
            resume("throw", e$1);
          });
        } catch (e$1) {
          settle("throw", e$1);
        }
      }
      function settle(e$1, n) {
        switch (e$1) {
          case "return":
            r.resolve({
              value: n,
              done: true
            });
            break;
          case "throw":
            r.reject(n);
            break;
          default:
            r.resolve({
              value: n,
              done: false
            });
        }
        (r = r.next) ? resume(r.key, r.arg) : t = null;
      }
      this._invoke = function(e$1, n) {
        return new Promise(function(o, u) {
          var i = {
            key: e$1,
            arg: n,
            resolve: o,
            reject: u,
            next: null
          };
          t ? t = t.next = i : (r = t = i, resume(e$1, n));
        });
      }, "function" != typeof e["return"] && (this["return"] = void 0);
    }
    AsyncGenerator.prototype["function" == typeof Symbol && Symbol.asyncIterator || "@@asyncIterator"] = function() {
      return this;
    }, AsyncGenerator.prototype.next = function(e) {
      return this._invoke("next", e);
    }, AsyncGenerator.prototype["throw"] = function(e) {
      return this._invoke("throw", e);
    }, AsyncGenerator.prototype["return"] = function(e) {
      return this._invoke("return", e);
    };
    module.exports = _wrapAsyncGenerator$1, module.exports.__esModule = true, module.exports["default"] = module.exports;
  } });
  var import_usingCtx = __toESM(require_usingCtx(), 1);
  var import_awaitAsyncGenerator = __toESM(require_awaitAsyncGenerator(), 1);
  var import_wrapAsyncGenerator = __toESM(require_wrapAsyncGenerator(), 1);
  var import_objectSpread29 = __toESM(require_objectSpread2(), 1);

  // node_modules/superjson/dist/double-indexed-kv.js
  var DoubleIndexedKV = class {
    constructor() {
      this.keyToValue = /* @__PURE__ */ new Map();
      this.valueToKey = /* @__PURE__ */ new Map();
    }
    set(key, value) {
      this.keyToValue.set(key, value);
      this.valueToKey.set(value, key);
    }
    getByKey(key) {
      return this.keyToValue.get(key);
    }
    getByValue(value) {
      return this.valueToKey.get(value);
    }
    clear() {
      this.keyToValue.clear();
      this.valueToKey.clear();
    }
  };

  // node_modules/superjson/dist/registry.js
  var Registry = class {
    constructor(generateIdentifier) {
      this.generateIdentifier = generateIdentifier;
      this.kv = new DoubleIndexedKV();
    }
    register(value, identifier) {
      if (this.kv.getByValue(value)) {
        return;
      }
      if (!identifier) {
        identifier = this.generateIdentifier(value);
      }
      this.kv.set(identifier, value);
    }
    clear() {
      this.kv.clear();
    }
    getIdentifier(value) {
      return this.kv.getByValue(value);
    }
    getValue(identifier) {
      return this.kv.getByKey(identifier);
    }
  };

  // node_modules/superjson/dist/class-registry.js
  var ClassRegistry = class extends Registry {
    constructor() {
      super((c) => c.name);
      this.classToAllowedProps = /* @__PURE__ */ new Map();
    }
    register(value, options) {
      if (typeof options === "object") {
        if (options.allowProps) {
          this.classToAllowedProps.set(value, options.allowProps);
        }
        super.register(value, options.identifier);
      } else {
        super.register(value, options);
      }
    }
    getAllowedProps(value) {
      return this.classToAllowedProps.get(value);
    }
  };

  // node_modules/superjson/dist/util.js
  function valuesOfObj(record) {
    if ("values" in Object) {
      return Object.values(record);
    }
    const values = [];
    for (const key in record) {
      if (record.hasOwnProperty(key)) {
        values.push(record[key]);
      }
    }
    return values;
  }
  function find(record, predicate) {
    const values = valuesOfObj(record);
    if ("find" in values) {
      return values.find(predicate);
    }
    const valuesNotNever = values;
    for (let i = 0; i < valuesNotNever.length; i++) {
      const value = valuesNotNever[i];
      if (predicate(value)) {
        return value;
      }
    }
    return void 0;
  }
  function forEach(record, run2) {
    Object.entries(record).forEach(([key, value]) => run2(value, key));
  }
  function includes(arr, value) {
    return arr.indexOf(value) !== -1;
  }
  function findArr(record, predicate) {
    for (let i = 0; i < record.length; i++) {
      const value = record[i];
      if (predicate(value)) {
        return value;
      }
    }
    return void 0;
  }

  // node_modules/superjson/dist/custom-transformer-registry.js
  var CustomTransformerRegistry = class {
    constructor() {
      this.transfomers = {};
    }
    register(transformer) {
      this.transfomers[transformer.name] = transformer;
    }
    findApplicable(v) {
      return find(this.transfomers, (transformer) => transformer.isApplicable(v));
    }
    findByName(name) {
      return this.transfomers[name];
    }
  };

  // node_modules/superjson/dist/is.js
  var getType = (payload) => Object.prototype.toString.call(payload).slice(8, -1);
  var isUndefined = (payload) => typeof payload === "undefined";
  var isNull = (payload) => payload === null;
  var isPlainObject = (payload) => {
    if (typeof payload !== "object" || payload === null)
      return false;
    if (payload === Object.prototype)
      return false;
    if (Object.getPrototypeOf(payload) === null)
      return true;
    return Object.getPrototypeOf(payload) === Object.prototype;
  };
  var isEmptyObject = (payload) => isPlainObject(payload) && Object.keys(payload).length === 0;
  var isArray = (payload) => Array.isArray(payload);
  var isString = (payload) => typeof payload === "string";
  var isNumber = (payload) => typeof payload === "number" && !isNaN(payload);
  var isBoolean = (payload) => typeof payload === "boolean";
  var isRegExp = (payload) => payload instanceof RegExp;
  var isMap = (payload) => payload instanceof Map;
  var isSet = (payload) => payload instanceof Set;
  var isSymbol = (payload) => getType(payload) === "Symbol";
  var isDate = (payload) => payload instanceof Date && !isNaN(payload.valueOf());
  var isError = (payload) => payload instanceof Error;
  var isNaNValue = (payload) => typeof payload === "number" && isNaN(payload);
  var isPrimitive = (payload) => isBoolean(payload) || isNull(payload) || isUndefined(payload) || isNumber(payload) || isString(payload) || isSymbol(payload);
  var isBigint = (payload) => typeof payload === "bigint";
  var isInfinite = (payload) => payload === Infinity || payload === -Infinity;
  var isTypedArray = (payload) => ArrayBuffer.isView(payload) && !(payload instanceof DataView);
  var isURL = (payload) => payload instanceof URL;

  // node_modules/superjson/dist/pathstringifier.js
  var escapeKey = (key) => key.replace(/\./g, "\\.");
  var stringifyPath = (path) => path.map(String).map(escapeKey).join(".");
  var parsePath = (string) => {
    const result = [];
    let segment = "";
    for (let i = 0; i < string.length; i++) {
      let char = string.charAt(i);
      const isEscapedDot = char === "\\" && string.charAt(i + 1) === ".";
      if (isEscapedDot) {
        segment += ".";
        i++;
        continue;
      }
      const isEndOfSegment = char === ".";
      if (isEndOfSegment) {
        result.push(segment);
        segment = "";
        continue;
      }
      segment += char;
    }
    const lastSegment = segment;
    result.push(lastSegment);
    return result;
  };

  // node_modules/superjson/dist/transformer.js
  function simpleTransformation(isApplicable, annotation, transform, untransform) {
    return {
      isApplicable,
      annotation,
      transform,
      untransform
    };
  }
  var simpleRules = [
    simpleTransformation(isUndefined, "undefined", () => null, () => void 0),
    simpleTransformation(isBigint, "bigint", (v) => v.toString(), (v) => {
      if (typeof BigInt !== "undefined") {
        return BigInt(v);
      }
      console.error("Please add a BigInt polyfill.");
      return v;
    }),
    simpleTransformation(isDate, "Date", (v) => v.toISOString(), (v) => new Date(v)),
    simpleTransformation(isError, "Error", (v, superJson) => {
      const baseError = {
        name: v.name,
        message: v.message
      };
      superJson.allowedErrorProps.forEach((prop) => {
        baseError[prop] = v[prop];
      });
      return baseError;
    }, (v, superJson) => {
      const e = new Error(v.message);
      e.name = v.name;
      e.stack = v.stack;
      superJson.allowedErrorProps.forEach((prop) => {
        e[prop] = v[prop];
      });
      return e;
    }),
    simpleTransformation(isRegExp, "regexp", (v) => "" + v, (regex) => {
      const body = regex.slice(1, regex.lastIndexOf("/"));
      const flags = regex.slice(regex.lastIndexOf("/") + 1);
      return new RegExp(body, flags);
    }),
    simpleTransformation(
      isSet,
      "set",
      // (sets only exist in es6+)
      // eslint-disable-next-line es5/no-es6-methods
      (v) => [...v.values()],
      (v) => new Set(v)
    ),
    simpleTransformation(isMap, "map", (v) => [...v.entries()], (v) => new Map(v)),
    simpleTransformation((v) => isNaNValue(v) || isInfinite(v), "number", (v) => {
      if (isNaNValue(v)) {
        return "NaN";
      }
      if (v > 0) {
        return "Infinity";
      } else {
        return "-Infinity";
      }
    }, Number),
    simpleTransformation((v) => v === 0 && 1 / v === -Infinity, "number", () => {
      return "-0";
    }, Number),
    simpleTransformation(isURL, "URL", (v) => v.toString(), (v) => new URL(v))
  ];
  function compositeTransformation(isApplicable, annotation, transform, untransform) {
    return {
      isApplicable,
      annotation,
      transform,
      untransform
    };
  }
  var symbolRule = compositeTransformation((s, superJson) => {
    if (isSymbol(s)) {
      const isRegistered = !!superJson.symbolRegistry.getIdentifier(s);
      return isRegistered;
    }
    return false;
  }, (s, superJson) => {
    const identifier = superJson.symbolRegistry.getIdentifier(s);
    return ["symbol", identifier];
  }, (v) => v.description, (_, a, superJson) => {
    const value = superJson.symbolRegistry.getValue(a[1]);
    if (!value) {
      throw new Error("Trying to deserialize unknown symbol");
    }
    return value;
  });
  var constructorToName = [
    Int8Array,
    Uint8Array,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    Uint8ClampedArray
  ].reduce((obj, ctor) => {
    obj[ctor.name] = ctor;
    return obj;
  }, {});
  var typedArrayRule = compositeTransformation(isTypedArray, (v) => ["typed-array", v.constructor.name], (v) => [...v], (v, a) => {
    const ctor = constructorToName[a[1]];
    if (!ctor) {
      throw new Error("Trying to deserialize unknown typed array");
    }
    return new ctor(v);
  });
  function isInstanceOfRegisteredClass(potentialClass, superJson) {
    if (potentialClass?.constructor) {
      const isRegistered = !!superJson.classRegistry.getIdentifier(potentialClass.constructor);
      return isRegistered;
    }
    return false;
  }
  var classRule = compositeTransformation(isInstanceOfRegisteredClass, (clazz, superJson) => {
    const identifier = superJson.classRegistry.getIdentifier(clazz.constructor);
    return ["class", identifier];
  }, (clazz, superJson) => {
    const allowedProps = superJson.classRegistry.getAllowedProps(clazz.constructor);
    if (!allowedProps) {
      return { ...clazz };
    }
    const result = {};
    allowedProps.forEach((prop) => {
      result[prop] = clazz[prop];
    });
    return result;
  }, (v, a, superJson) => {
    const clazz = superJson.classRegistry.getValue(a[1]);
    if (!clazz) {
      throw new Error(`Trying to deserialize unknown class '${a[1]}' - check https://github.com/blitz-js/superjson/issues/116#issuecomment-773996564`);
    }
    return Object.assign(Object.create(clazz.prototype), v);
  });
  var customRule = compositeTransformation((value, superJson) => {
    return !!superJson.customTransformerRegistry.findApplicable(value);
  }, (value, superJson) => {
    const transformer = superJson.customTransformerRegistry.findApplicable(value);
    return ["custom", transformer.name];
  }, (value, superJson) => {
    const transformer = superJson.customTransformerRegistry.findApplicable(value);
    return transformer.serialize(value);
  }, (v, a, superJson) => {
    const transformer = superJson.customTransformerRegistry.findByName(a[1]);
    if (!transformer) {
      throw new Error("Trying to deserialize unknown custom value");
    }
    return transformer.deserialize(v);
  });
  var compositeRules = [classRule, symbolRule, customRule, typedArrayRule];
  var transformValue = (value, superJson) => {
    const applicableCompositeRule = findArr(compositeRules, (rule) => rule.isApplicable(value, superJson));
    if (applicableCompositeRule) {
      return {
        value: applicableCompositeRule.transform(value, superJson),
        type: applicableCompositeRule.annotation(value, superJson)
      };
    }
    const applicableSimpleRule = findArr(simpleRules, (rule) => rule.isApplicable(value, superJson));
    if (applicableSimpleRule) {
      return {
        value: applicableSimpleRule.transform(value, superJson),
        type: applicableSimpleRule.annotation
      };
    }
    return void 0;
  };
  var simpleRulesByAnnotation = {};
  simpleRules.forEach((rule) => {
    simpleRulesByAnnotation[rule.annotation] = rule;
  });
  var untransformValue = (json, type, superJson) => {
    if (isArray(type)) {
      switch (type[0]) {
        case "symbol":
          return symbolRule.untransform(json, type, superJson);
        case "class":
          return classRule.untransform(json, type, superJson);
        case "custom":
          return customRule.untransform(json, type, superJson);
        case "typed-array":
          return typedArrayRule.untransform(json, type, superJson);
        default:
          throw new Error("Unknown transformation: " + type);
      }
    } else {
      const transformation = simpleRulesByAnnotation[type];
      if (!transformation) {
        throw new Error("Unknown transformation: " + type);
      }
      return transformation.untransform(json, superJson);
    }
  };

  // node_modules/superjson/dist/accessDeep.js
  var getNthKey = (value, n) => {
    if (n > value.size)
      throw new Error("index out of bounds");
    const keys = value.keys();
    while (n > 0) {
      keys.next();
      n--;
    }
    return keys.next().value;
  };
  function validatePath(path) {
    if (includes(path, "__proto__")) {
      throw new Error("__proto__ is not allowed as a property");
    }
    if (includes(path, "prototype")) {
      throw new Error("prototype is not allowed as a property");
    }
    if (includes(path, "constructor")) {
      throw new Error("constructor is not allowed as a property");
    }
  }
  var getDeep = (object, path) => {
    validatePath(path);
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      if (isSet(object)) {
        object = getNthKey(object, +key);
      } else if (isMap(object)) {
        const row = +key;
        const type = +path[++i] === 0 ? "key" : "value";
        const keyOfRow = getNthKey(object, row);
        switch (type) {
          case "key":
            object = keyOfRow;
            break;
          case "value":
            object = object.get(keyOfRow);
            break;
        }
      } else {
        object = object[key];
      }
    }
    return object;
  };
  var setDeep = (object, path, mapper) => {
    validatePath(path);
    if (path.length === 0) {
      return mapper(object);
    }
    let parent = object;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (isArray(parent)) {
        const index = +key;
        parent = parent[index];
      } else if (isPlainObject(parent)) {
        parent = parent[key];
      } else if (isSet(parent)) {
        const row = +key;
        parent = getNthKey(parent, row);
      } else if (isMap(parent)) {
        const isEnd = i === path.length - 2;
        if (isEnd) {
          break;
        }
        const row = +key;
        const type = +path[++i] === 0 ? "key" : "value";
        const keyOfRow = getNthKey(parent, row);
        switch (type) {
          case "key":
            parent = keyOfRow;
            break;
          case "value":
            parent = parent.get(keyOfRow);
            break;
        }
      }
    }
    const lastKey = path[path.length - 1];
    if (isArray(parent)) {
      parent[+lastKey] = mapper(parent[+lastKey]);
    } else if (isPlainObject(parent)) {
      parent[lastKey] = mapper(parent[lastKey]);
    }
    if (isSet(parent)) {
      const oldValue = getNthKey(parent, +lastKey);
      const newValue = mapper(oldValue);
      if (oldValue !== newValue) {
        parent.delete(oldValue);
        parent.add(newValue);
      }
    }
    if (isMap(parent)) {
      const row = +path[path.length - 2];
      const keyToRow = getNthKey(parent, row);
      const type = +lastKey === 0 ? "key" : "value";
      switch (type) {
        case "key": {
          const newKey = mapper(keyToRow);
          parent.set(newKey, parent.get(keyToRow));
          if (newKey !== keyToRow) {
            parent.delete(keyToRow);
          }
          break;
        }
        case "value": {
          parent.set(keyToRow, mapper(parent.get(keyToRow)));
          break;
        }
      }
    }
    return object;
  };

  // node_modules/superjson/dist/plainer.js
  function traverse(tree, walker2, origin = []) {
    if (!tree) {
      return;
    }
    if (!isArray(tree)) {
      forEach(tree, (subtree, key) => traverse(subtree, walker2, [...origin, ...parsePath(key)]));
      return;
    }
    const [nodeValue, children] = tree;
    if (children) {
      forEach(children, (child, key) => {
        traverse(child, walker2, [...origin, ...parsePath(key)]);
      });
    }
    walker2(nodeValue, origin);
  }
  function applyValueAnnotations(plain, annotations, superJson) {
    traverse(annotations, (type, path) => {
      plain = setDeep(plain, path, (v) => untransformValue(v, type, superJson));
    });
    return plain;
  }
  function applyReferentialEqualityAnnotations(plain, annotations) {
    function apply(identicalPaths, path) {
      const object = getDeep(plain, parsePath(path));
      identicalPaths.map(parsePath).forEach((identicalObjectPath) => {
        plain = setDeep(plain, identicalObjectPath, () => object);
      });
    }
    if (isArray(annotations)) {
      const [root, other] = annotations;
      root.forEach((identicalPath) => {
        plain = setDeep(plain, parsePath(identicalPath), () => plain);
      });
      if (other) {
        forEach(other, apply);
      }
    } else {
      forEach(annotations, apply);
    }
    return plain;
  }
  var isDeep = (object, superJson) => isPlainObject(object) || isArray(object) || isMap(object) || isSet(object) || isInstanceOfRegisteredClass(object, superJson);
  function addIdentity(object, path, identities) {
    const existingSet = identities.get(object);
    if (existingSet) {
      existingSet.push(path);
    } else {
      identities.set(object, [path]);
    }
  }
  function generateReferentialEqualityAnnotations(identitites, dedupe) {
    const result = {};
    let rootEqualityPaths = void 0;
    identitites.forEach((paths) => {
      if (paths.length <= 1) {
        return;
      }
      if (!dedupe) {
        paths = paths.map((path) => path.map(String)).sort((a, b) => a.length - b.length);
      }
      const [representativePath, ...identicalPaths] = paths;
      if (representativePath.length === 0) {
        rootEqualityPaths = identicalPaths.map(stringifyPath);
      } else {
        result[stringifyPath(representativePath)] = identicalPaths.map(stringifyPath);
      }
    });
    if (rootEqualityPaths) {
      if (isEmptyObject(result)) {
        return [rootEqualityPaths];
      } else {
        return [rootEqualityPaths, result];
      }
    } else {
      return isEmptyObject(result) ? void 0 : result;
    }
  }
  var walker = (object, identities, superJson, dedupe, path = [], objectsInThisPath = [], seenObjects = /* @__PURE__ */ new Map()) => {
    const primitive = isPrimitive(object);
    if (!primitive) {
      addIdentity(object, path, identities);
      const seen = seenObjects.get(object);
      if (seen) {
        return dedupe ? {
          transformedValue: null
        } : seen;
      }
    }
    if (!isDeep(object, superJson)) {
      const transformed2 = transformValue(object, superJson);
      const result2 = transformed2 ? {
        transformedValue: transformed2.value,
        annotations: [transformed2.type]
      } : {
        transformedValue: object
      };
      if (!primitive) {
        seenObjects.set(object, result2);
      }
      return result2;
    }
    if (includes(objectsInThisPath, object)) {
      return {
        transformedValue: null
      };
    }
    const transformationResult = transformValue(object, superJson);
    const transformed = transformationResult?.value ?? object;
    const transformedValue = isArray(transformed) ? [] : {};
    const innerAnnotations = {};
    forEach(transformed, (value, index) => {
      if (index === "__proto__" || index === "constructor" || index === "prototype") {
        throw new Error(`Detected property ${index}. This is a prototype pollution risk, please remove it from your object.`);
      }
      const recursiveResult = walker(value, identities, superJson, dedupe, [...path, index], [...objectsInThisPath, object], seenObjects);
      transformedValue[index] = recursiveResult.transformedValue;
      if (isArray(recursiveResult.annotations)) {
        innerAnnotations[index] = recursiveResult.annotations;
      } else if (isPlainObject(recursiveResult.annotations)) {
        forEach(recursiveResult.annotations, (tree, key) => {
          innerAnnotations[escapeKey(index) + "." + key] = tree;
        });
      }
    });
    const result = isEmptyObject(innerAnnotations) ? {
      transformedValue,
      annotations: !!transformationResult ? [transformationResult.type] : void 0
    } : {
      transformedValue,
      annotations: !!transformationResult ? [transformationResult.type, innerAnnotations] : innerAnnotations
    };
    if (!primitive) {
      seenObjects.set(object, result);
    }
    return result;
  };

  // node_modules/is-what/dist/index.js
  function getType2(payload) {
    return Object.prototype.toString.call(payload).slice(8, -1);
  }
  function isArray2(payload) {
    return getType2(payload) === "Array";
  }
  function isPlainObject2(payload) {
    if (getType2(payload) !== "Object")
      return false;
    const prototype = Object.getPrototypeOf(payload);
    return !!prototype && prototype.constructor === Object && prototype === Object.prototype;
  }
  function isNull2(payload) {
    return getType2(payload) === "Null";
  }
  function isOneOf(a, b, c, d, e) {
    return (value) => a(value) || b(value) || !!c && c(value) || !!d && d(value) || !!e && e(value);
  }
  function isUndefined2(payload) {
    return getType2(payload) === "Undefined";
  }
  var isNullOrUndefined = isOneOf(isNull2, isUndefined2);

  // node_modules/copy-anything/dist/index.js
  function assignProp(carry, key, newVal, originalObject, includeNonenumerable) {
    const propType = {}.propertyIsEnumerable.call(originalObject, key) ? "enumerable" : "nonenumerable";
    if (propType === "enumerable")
      carry[key] = newVal;
    if (includeNonenumerable && propType === "nonenumerable") {
      Object.defineProperty(carry, key, {
        value: newVal,
        enumerable: false,
        writable: true,
        configurable: true
      });
    }
  }
  function copy(target, options = {}) {
    if (isArray2(target)) {
      return target.map((item) => copy(item, options));
    }
    if (!isPlainObject2(target)) {
      return target;
    }
    const props = Object.getOwnPropertyNames(target);
    const symbols = Object.getOwnPropertySymbols(target);
    return [...props, ...symbols].reduce((carry, key) => {
      if (isArray2(options.props) && !options.props.includes(key)) {
        return carry;
      }
      const val = target[key];
      const newVal = copy(val, options);
      assignProp(carry, key, newVal, target, options.nonenumerable);
      return carry;
    }, {});
  }

  // node_modules/superjson/dist/index.js
  var SuperJSON = class {
    /**
     * @param dedupeReferentialEqualities  If true, SuperJSON will make sure only one instance of referentially equal objects are serialized and the rest are replaced with `null`.
     */
    constructor({ dedupe = false } = {}) {
      this.classRegistry = new ClassRegistry();
      this.symbolRegistry = new Registry((s) => s.description ?? "");
      this.customTransformerRegistry = new CustomTransformerRegistry();
      this.allowedErrorProps = [];
      this.dedupe = dedupe;
    }
    serialize(object) {
      const identities = /* @__PURE__ */ new Map();
      const output = walker(object, identities, this, this.dedupe);
      const res = {
        json: output.transformedValue
      };
      if (output.annotations) {
        res.meta = {
          ...res.meta,
          values: output.annotations
        };
      }
      const equalityAnnotations = generateReferentialEqualityAnnotations(identities, this.dedupe);
      if (equalityAnnotations) {
        res.meta = {
          ...res.meta,
          referentialEqualities: equalityAnnotations
        };
      }
      return res;
    }
    deserialize(payload) {
      const { json, meta } = payload;
      let result = copy(json);
      if (meta?.values) {
        result = applyValueAnnotations(result, meta.values, this);
      }
      if (meta?.referentialEqualities) {
        result = applyReferentialEqualityAnnotations(result, meta.referentialEqualities);
      }
      return result;
    }
    stringify(object) {
      return JSON.stringify(this.serialize(object));
    }
    parse(string) {
      return this.deserialize(JSON.parse(string));
    }
    registerClass(v, options) {
      this.classRegistry.register(v, options);
    }
    registerSymbol(v, identifier) {
      this.symbolRegistry.register(v, identifier);
    }
    registerCustom(transformer, name) {
      this.customTransformerRegistry.register({
        name,
        ...transformer
      });
    }
    allowErrorProps(...props) {
      this.allowedErrorProps.push(...props);
    }
  };
  SuperJSON.defaultInstance = new SuperJSON();
  SuperJSON.serialize = SuperJSON.defaultInstance.serialize.bind(SuperJSON.defaultInstance);
  SuperJSON.deserialize = SuperJSON.defaultInstance.deserialize.bind(SuperJSON.defaultInstance);
  SuperJSON.stringify = SuperJSON.defaultInstance.stringify.bind(SuperJSON.defaultInstance);
  SuperJSON.parse = SuperJSON.defaultInstance.parse.bind(SuperJSON.defaultInstance);
  SuperJSON.registerClass = SuperJSON.defaultInstance.registerClass.bind(SuperJSON.defaultInstance);
  SuperJSON.registerSymbol = SuperJSON.defaultInstance.registerSymbol.bind(SuperJSON.defaultInstance);
  SuperJSON.registerCustom = SuperJSON.defaultInstance.registerCustom.bind(SuperJSON.defaultInstance);
  SuperJSON.allowErrorProps = SuperJSON.defaultInstance.allowErrorProps.bind(SuperJSON.defaultInstance);
  var serialize = SuperJSON.serialize;
  var deserialize = SuperJSON.deserialize;
  var stringify = SuperJSON.stringify;
  var parse = SuperJSON.parse;
  var registerClass = SuperJSON.registerClass;
  var registerCustom = SuperJSON.registerCustom;
  var registerSymbol = SuperJSON.registerSymbol;
  var allowErrorProps = SuperJSON.allowErrorProps;

  // src/inspector/managers/AIManager.ts
  var AIManager = class {
    constructor() {
      this.trpcClient = null;
      this.wsClient = null;
      this.currentSubscription = null;
      this.globalSessionId = null;
    }
    initialize(aiEndpoint) {
      if (!aiEndpoint) return;
      if (this.wsClient) {
        this.wsClient.close();
      }
      const wsUrl = aiEndpoint.replace("http://", "ws://").replace("https://", "wss://");
      this.wsClient = createWSClient({
        url: `${wsUrl}/trpc`
      });
      this.trpcClient = createTRPCClient({
        links: [
          splitLink({
            condition(op) {
              return op.type === "subscription";
            },
            true: wsLink({
              client: this.wsClient,
              transformer: SuperJSON
            }),
            false: httpBatchLink({
              url: `${aiEndpoint}/trpc`,
              transformer: SuperJSON
            })
          })
        ]
      });
    }
    async sendMessage(userPrompt, selectedElements, pageInfo, cwd, handler) {
      if (!this.trpcClient) {
        throw new Error("tRPC client not initialized");
      }
      const structuredInput = {
        userPrompt,
        selectedElements,
        pageInfo,
        cwd,
        sessionId: this.globalSessionId || void 0
      };
      const subscription = this.trpcClient.sendMessage.subscribe(
        structuredInput,
        {
          onData: (data) => {
            console.log("SSE data received:", data);
            if ((data.type === "claude_json" || data.type === "claude_response" || data.type === "complete") && data.sessionId) {
              this.globalSessionId = data.sessionId;
              console.log("Session ID updated:", this.globalSessionId);
            }
            handler.onData(data);
            if (data.type === "complete") {
              console.log("AI request completed with session ID:", data.sessionId);
              this.currentSubscription = null;
              handler.onComplete();
            }
          },
          onError: (error) => {
            console.error("Subscription error:", error);
            this.currentSubscription = null;
            handler.onError(error);
          }
        }
      );
      this.currentSubscription = subscription;
    }
    async newChat() {
      if (this.trpcClient) {
        try {
          await this.trpcClient.newChat.mutate();
          this.globalSessionId = null;
        } catch (error) {
          console.error("Failed to start new chat:", error);
          throw error;
        }
      } else {
        console.warn("tRPC client not initialized");
        throw new Error("tRPC client not initialized");
      }
    }
    cancel() {
      if (this.currentSubscription) {
        console.log("Cancelling current AI request");
        this.currentSubscription.unsubscribe();
        this.currentSubscription = null;
      }
    }
    getSessionId() {
      return this.globalSessionId;
    }
    isInitialized() {
      return this.trpcClient !== null;
    }
    isProcessing() {
      return this.currentSubscription !== null;
    }
    destroy() {
      if (this.currentSubscription) {
        this.currentSubscription.unsubscribe();
      }
      if (this.wsClient) {
        this.wsClient.close();
      }
    }
  };

  // src/inspector/managers/InspectionManager.ts
  var InspectionManager = class {
    constructor(onElementSelect, shouldIgnoreElement, isElementSelected) {
      this.isInspecting = false;
      this.currentHoveredElement = null;
      this.inspectionStyleElement = null;
      this.onElementSelect = onElementSelect;
      this.shouldIgnoreElement = shouldIgnoreElement;
      this.isElementSelected = isElementSelected;
      this.handleMouseOver = this.handleMouseOver.bind(this);
      this.handleMouseOut = this.handleMouseOut.bind(this);
      this.handleElementClick = this.handleElementClick.bind(this);
      this.preventMouseEvents = this.preventMouseEvents.bind(this);
    }
    enterInspectionMode() {
      if (this.isInspecting) return;
      this.isInspecting = true;
      this.addInspectionStyles();
      document.addEventListener("mouseover", this.handleMouseOver, true);
      document.addEventListener("mouseout", this.handleMouseOut, true);
      document.addEventListener("click", this.handleElementClick, true);
      document.addEventListener("mousedown", this.preventMouseEvents, true);
      document.addEventListener("mouseup", this.preventMouseEvents, true);
      document.addEventListener("dblclick", this.preventMouseEvents, true);
      document.addEventListener("contextmenu", this.preventMouseEvents, true);
    }
    exitInspectionMode() {
      if (!this.isInspecting) return;
      this.isInspecting = false;
      this.removeInspectionStyles();
      document.removeEventListener("mouseover", this.handleMouseOver, true);
      document.removeEventListener("mouseout", this.handleMouseOut, true);
      document.removeEventListener("click", this.handleElementClick, true);
      document.removeEventListener("mousedown", this.preventMouseEvents, true);
      document.removeEventListener("mouseup", this.preventMouseEvents, true);
      document.removeEventListener("dblclick", this.preventMouseEvents, true);
      document.removeEventListener("contextmenu", this.preventMouseEvents, true);
      this.removeHoverHighlight();
    }
    isInInspectionMode() {
      return this.isInspecting;
    }
    addInspectionStyles() {
      this.inspectionStyleElement = document.createElement("style");
      this.inspectionStyleElement.id = "inspector-toolbar-styles";
      this.inspectionStyleElement.textContent = `
      * {
        cursor: crosshair !important;
      }
    `;
      document.head.appendChild(this.inspectionStyleElement);
    }
    removeInspectionStyles() {
      if (this.inspectionStyleElement) {
        this.inspectionStyleElement.remove();
        this.inspectionStyleElement = null;
      }
    }
    handleMouseOver(e) {
      const target = e.target;
      if (this.shouldIgnoreElement?.(target)) return;
      this.removeHoverHighlight();
      target.style.outline = "3px solid #3B82F6";
      target.style.outlineOffset = "-1px";
      this.currentHoveredElement = target;
    }
    handleMouseOut(e) {
      const target = e.target;
      if (this.shouldIgnoreElement?.(target)) return;
      if (!this.isElementSelected?.(target)) {
        ;
        target.style.outline = "";
        target.style.outlineOffset = "";
      }
    }
    handleElementClick(e) {
      const target = e.target;
      if (this.shouldIgnoreElement?.(target)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.onElementSelect?.(target);
    }
    preventMouseEvents(e) {
      const target = e.target;
      if (this.shouldIgnoreElement?.(target)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
    removeHoverHighlight() {
      if (this.currentHoveredElement) {
        if (!this.isElementSelected?.(this.currentHoveredElement)) {
          ;
          this.currentHoveredElement.style.outline = "";
          this.currentHoveredElement.style.outlineOffset = "";
        }
        this.currentHoveredElement = null;
      }
    }
    destroy() {
      this.exitInspectionMode();
    }
  };

  // src/inspector/detectors/ComponentDetector.ts
  var ComponentDetector = class _ComponentDetector {
    static findNearestComponent(element) {
      if (!element || element === document.body) return null;
      try {
        let componentInfo = _ComponentDetector.getVueComponentInfo(element);
        if (componentInfo) {
          console.log("\u{1F7E2} Vue component found:", componentInfo);
        } else {
          console.log("\u{1F50D} No Vue component found for element:", element.tagName, "Checking properties:", {
            __vnode: !!element.__vnode,
            __vueParentComponent: !!element.__vueParentComponent,
            __vue__: !!element.__vue__,
            __v_inspector: !!element.__v_inspector
          });
        }
        if (!componentInfo) {
          componentInfo = _ComponentDetector.getVanillaComponentInfo(element);
          if (componentInfo) {
            console.log("\u{1F7E1} Vanilla component found:", componentInfo);
          }
        }
        if (componentInfo) {
          return componentInfo;
        }
        return _ComponentDetector.findNearestComponent(element.parentElement);
      } catch (e) {
        console.error("Error finding nearest component:", e);
        return null;
      }
    }
    static getVanillaComponentInfo(element) {
      const componentName = element.getAttribute("data-component-name");
      const componentFile = element.getAttribute("data-component-file");
      if (!componentName && !componentFile) {
        return null;
      }
      return {
        componentLocation: `${componentFile}@${componentName}`
      };
    }
    static getVueComponentInfo(element) {
      if (!element) return null;
      const elementAny = element;
      let codeLocation = elementAny.__vnode?.props?.__v_inspector;
      if (!codeLocation) {
        codeLocation = elementAny.__vueParentComponent?.vnode?.props?.__v_inspector;
      }
      if (!codeLocation) {
        codeLocation = elementAny.__v_inspector;
      }
      if (!codeLocation) {
        const vueInstance = elementAny.__vue__ || elementAny.__vueParentComponent;
        if (vueInstance) {
          codeLocation = vueInstance.__v_inspector || vueInstance.$options?.__v_inspector || vueInstance.type?.__v_inspector;
        }
      }
      if (!codeLocation) {
        const vnode = elementAny.__vnode || elementAny.$vnode;
        if (vnode) {
          codeLocation = vnode.__v_inspector || vnode.props?.__v_inspector || vnode.componentOptions?.__v_inspector;
        }
      }
      if (!codeLocation) {
        return null;
      }
      return {
        componentLocation: codeLocation
      };
    }
  };

  // src/inspector/ui/styles.ts
  var TOOLBAR_STYLES = `
  :host {
    position: fixed;
    bottom: 20px;
    right: 40px;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  }

  :host * {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    box-sizing: border-box;
  }

  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    14% { background-position: 23% 77%; }
    27% { background-position: 52% 68%; }
    41% { background-position: 79% 42%; }
    56% { background-position: 95% 21%; }
    73% { background-position: 62% 30%; }
    88% { background-position: 31% 47%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes blinkEye {
    0%, 90%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.1); }
  }

  @keyframes glowingAura {
    0% { box-shadow: 0 0 10px 5px rgba(255, 107, 107, 0.4), 0 0 20px 10px rgba(255, 150, 113, 0.2), 0 0 0 2px rgba(255, 255, 255, 0.1); }
    13% { box-shadow: 0 0 18px 12px rgba(249, 212, 35, 0.5), 0 0 28px 15px rgba(254, 202, 87, 0.3), 0 0 0 3px rgba(255, 255, 255, 0.16); }
    27% { box-shadow: 0 0 15px 8px rgba(255, 159, 243, 0.6), 0 0 24px 11px rgba(255, 140, 66, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.12); }
    42% { box-shadow: 0 0 22px 14px rgba(255, 200, 87, 0.55), 0 0 30px 16px rgba(255, 107, 107, 0.28), 0 0 0 4px rgba(255, 255, 255, 0.18); }
    58% { box-shadow: 0 0 12px 7px rgba(255, 166, 107, 0.45), 0 0 19px 9px rgba(255, 126, 103, 0.25), 0 0 0 2px rgba(255, 255, 255, 0.11); }
    73% { box-shadow: 0 0 20px 13px rgba(249, 212, 35, 0.62), 0 0 26px 14px rgba(255, 150, 113, 0.42), 0 0 0 3px rgba(255, 255, 255, 0.22); }
    87% { box-shadow: 0 0 16px 9px rgba(255, 107, 107, 0.53), 0 0 22px 13px rgba(254, 202, 87, 0.32), 0 0 0 2px rgba(255, 255, 255, 0.14); }
    100% { box-shadow: 0 0 10px 5px rgba(255, 107, 107, 0.4), 0 0 20px 10px rgba(255, 150, 113, 0.2), 0 0 0 2px rgba(255, 255, 255, 0.1); }
  }

  .toolbar-button {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #FF6B6B, #FF9671, #FFA75F, #F9D423, #FECA57, #FF7E67, #FF8C42, #FFC857);
    background-size: 400% 400%;
    animation: gradientShift 7.3s ease-in-out infinite, glowingAura 9.7s infinite cubic-bezier(0.42, 0, 0.58, 1);
    border: none;
    color: white;
    cursor: pointer;
    filter: drop-shadow(0 0 8px rgba(255, 107, 107, 0.5));
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    position: relative;
    z-index: 10000000;
  }

  .toolbar-button::before {
    content: '';
    position: absolute;
    inset: -10px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 107, 107, 0.3) 0%, rgba(255, 140, 66, 0.2) 50%, rgba(249, 212, 35, 0.1) 70%, transparent 100%);
    filter: blur(10px);
    opacity: 0.7;
    z-index: -1;
    animation: rotateMist 13.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
    transition: all 0.5s ease;
  }

  @keyframes rotateMist {
    0% { transform: rotate(0deg) scale(1); }
    17% { transform: rotate(83deg) scale(1.15) translateX(3px); }
    31% { transform: rotate(127deg) scale(0.95) translateY(-4px); }
    48% { transform: rotate(195deg) scale(1.12) translateX(-2px) translateY(3px); }
    63% { transform: rotate(246deg) scale(1.05) translateY(5px); }
    79% { transform: rotate(301deg) scale(0.97) translateX(4px) translateY(-2px); }
    91% { transform: rotate(342deg) scale(1.08) translateY(-3px); }
    100% { transform: rotate(360deg) scale(1); }
  }

  .toolbar-button:hover {
    transform: scale(1.1);
  }

  .toolbar-button:hover::before {
    inset: -15px;
    filter: blur(15px);
    opacity: 0.9;
  }

  .toolbar-button.active {
    background-size: 400% 400%;
    animation: gradientShift 5.2s cubic-bezier(0.36, 0.11, 0.89, 0.32) infinite;
    transform: scale(1.15);
  }

  .toolbar-button.active::before {
    inset: -20px;
    filter: blur(20px);
    opacity: 1;
    animation: rotateMist 9.7s cubic-bezier(0.34, 0.82, 0.6, 0.23) infinite;
  }

  .toolbar-button .icon {
    width: 25px;
    height: 25px;
    animation: blinkEye 5s infinite;
  }

  .toolbar-card {
    cursor: auto !important;
    position: absolute;
    bottom: 30px;
    right: -13px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    padding: 12px;
    display: none;
    min-width: 380px;
    transform: translateY(20px);
    opacity: 0;
    transition: transform 0.3s ease, opacity 0.3s ease;
    z-index: 1;
  }

  .toolbar-card.expanded {
    display: block;
    transform: translateY(0);
    opacity: 1;
  }

  .toolbar-header {
    display: flex;
    flex-direction: column;
    margin-bottom: 10px;
    width: 100%;
    gap: 8px;
  }

  .session-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #64748b;
    padding: 4px 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
  }

  .session-label {
    font-weight: 500;
  }

  .session-id {
    font-family: 'Monaco', 'Courier New', monospace;
    background: #ffffff;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid #e5e7eb;
    font-size: 10px;
    color: #374151;
    min-width: 60px;
    text-align: center;
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .toolbar-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 13px;
    transition: border-color 0.2s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    width: 100%;
  }

  .toolbar-input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  .action-button {
    padding: 4px 8px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    height: 26px;
    line-height: 1.3;
  }

  .inspect-button {
    background: #4b83da;
    border: 1px solid #2d5ca8;
    color: white;
  }

  .inspect-button:hover {
    background: #3a72c9;
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(59, 130, 246, 0.2);
  }

  .inspect-button:active {
    transform: translateY(0);
    background: #2c5aa0;
  }

  .close-button {
    background: #e05252;
    border: 1px solid #b03e3e;
    color: white;
    display: none;
  }

  .close-button:hover {
    background: #cc4545;
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(224, 82, 82, 0.2);
  }

  .close-button:active {
    transform: translateY(0);
    background: #b73a3a;
  }

  .new-chat-button {
    background: #4ead88;
    border: 1px solid #3a8a68;
    color: white;
  }

  .new-chat-button:hover {
    background: #419a78;
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(78, 173, 136, 0.2);
  }

  .new-chat-button:active {
    transform: translateY(0);
    background: #358a6c;
  }

  .cancel-button {
    background: #f59e0b;
    border: 1px solid #d97706;
    color: white;
    display: none;
  }

  .cancel-button:hover {
    background: #e5890c;
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(245, 158, 11, 0.2);
  }

  .cancel-button:active {
    transform: translateY(0);
    background: #d97706;
  }

  .clear-button {
    background: #6b7280;
    border: 1px solid #4b5563;
    color: white;
  }

  .clear-button:hover {
    background: #5d646f;
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(107, 114, 128, 0.2);
  }

  .clear-button:active {
    transform: translateY(0);
    background: #4b5563;
  }

  .copy-button {
    background: #8b5cf6;
    border: 1px solid #7c3aed;
    color: white;
  }

  .copy-button:hover {
    background: #7c3aed;
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(139, 92, 246, 0.2);
  }

  .copy-button:active {
    transform: translateY(0);
    background: #6d28d9;
  }

  .inspecting .close-button {
    display: inline-flex;
  }

  .inspecting .inspect-button {
    display: none;
  }

  .icon {
    width: 18px;
    height: 18px;
  }

  .json-display {
    margin-top: 12px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    max-height: 400px;
    display: none;
  }

  .json-display.show {
    display: block;
  }

  .json-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    border-bottom: 1px solid #e5e7eb;
    background: #f8fafc;
    border-radius: 6px 6px 0 0;
  }

  .json-header span {
    font-size: 11px;
    font-weight: 500;
    color: #64748b;
  }

  .json-clear-button {
    padding: 2px 6px;
    border: none;
    border-radius: 3px;
    background: #e2e8f0;
    color: #64748b;
    font-size: 9px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .json-clear-button:hover {
    background: #cbd5e1;
  }

  .json-content {
    max-height: 350px;
    overflow-y: auto;
    padding: 4px;
  }

  .json-message {
    margin-bottom: 3px;
    padding: 6px 8px;
    background: #fafbfc;
    border-left: 3px solid #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11px;
    color: #1f2937;
    line-height: 1.4;
  }

  .json-message.assistant {
    border-left-color: #3b82f6;
    background: #f0f9ff;
  }

  .json-message.user {
    border-left-color: #10b981;
    background: #f0fdf4;
  }

  .json-message.system {
    border-left-color: #64748b;
    background: #f8fafc;
    font-size: 10px;
    color: #64748b;
  }

  .json-message.result {
    border-left-color: #8b5cf6;
    background: #faf5ff;
  }

  .message-wrapper {
    position: relative;
  }

  .message-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    background: #4f46e5;
    color: white;
    font-size: 8px;
    font-weight: 500;
    padding: 2px 6px;
    border-radius: 8px;
    white-space: nowrap;
    z-index: 1;
    line-height: 1.2;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .json-message.assistant .message-badge {
    background: #3b82f6;
  }

  .json-message.user .message-badge {
    background: #10b981;
  }

  .json-message.system .message-badge {
    background: #64748b;
  }

  .json-message.result .message-badge {
    background: #8b5cf6;
  }

  .message-content {
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    padding-right: 20px;
  }

  .message-meta {
    font-size: 9px;
    color: #94a3b8;
    margin-top: 4px;
    display: flex;
    gap: 8px;
  }

  .tool-use {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 3px;
    margin: 4px 0;
    padding: 4px 6px;
  }

  .tool-name {
    font-weight: 500;
    font-size: 10px;
    color: #475569;
  }

  .tool-input {
    font-family: 'Courier New', monospace;
    font-size: 9px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 2px;
    padding: 3px;
    margin-top: 2px;
    max-height: 60px;
    overflow-y: auto;
  }

  .json-message:last-child {
    margin-bottom: 0;
  }

  .toolbar-card.processing .toolbar-input,
  .toolbar-card.processing .toolbar-actions {
    display: none;
  }

  .processing-indicator {
    display: none;
    text-align: center;
    padding: 20px;
    color: #6b7280;
    font-size: 14px;
    animation: pulse 2s infinite;
  }

  .toolbar-card.processing .processing-indicator {
    display: block;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.8; }
    50% { opacity: 1; }
  }

  .processing-dots {
    display: inline-block;
    animation: dots 1.5s infinite;
  }

  @keyframes dots {
    0%, 20% { content: ''; }
    40% { content: '.'; }
    60% { content: '..'; }
    80%, 100% { content: '...'; }
  }
`;

  // src/inspector/ui/UIRenderer.ts
  var UIRenderer = class {
    static renderToolbar() {
      return `
      <style>
        ${TOOLBAR_STYLES}
      </style>

      <div class="toolbar-button" id="toggleButton">
        <svg class="icon" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
          <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
        </svg>
      </div>

      <div class="toolbar-card" id="toolbarCard">
        <div class="toolbar-header">
          <div class="session-info" id="sessionInfo">
            <span class="session-label">Session:</span>
            <span class="session-id" id="sessionId">-</span>
            <button class="action-button cancel-button" id="cancelButton">
              <span>Cancel</span>
            </button>
            <button class="action-button new-chat-button" id="newChatButton">
              <span>New Chat</span>
            </button>
          </div>
          <textarea rows="2" autocomplete="off" type="text" class="toolbar-input" id="promptInput" placeholder="Type your prompt then press Enter"></textarea>
        </div>
        
        <div class="toolbar-actions">
          <button class="action-button inspect-button" id="inspectButton">
            <span>Inspect</span>
          </button>
          <button class="action-button clear-button" id="clearElementButton">
            <span>Clear</span>
          </button>
          <button class="action-button close-button" id="closeInspectButton">
            <span>Cancel</span>
          </button>
        </div>
        
        <div class="processing-indicator" id="processingIndicator">
          <div>\u{1F504} Processing with Claude<span class="processing-dots"></span></div>
        </div>
        
        <div class="json-display" id="jsonDisplay">
          <div class="json-header">
            <span>Claude Code Messages</span>
            <button class="json-clear-button" id="jsonClearButton">Clear</button>
          </div>
          <div class="json-content" id="jsonContent"></div>
        </div>
      </div>
    `;
    }
  };

  // src/inspector/utils/html.ts
  var HtmlUtils = class {
    static escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    static async copyToClipboard(text) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return true;
        }
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        return successful;
      } catch (error) {
        console.error("Failed to copy to clipboard:", error);
        return false;
      }
    }
    static hashString(content) {
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return hash.toString();
    }
  };

  // src/inspector/formatters/MessageFormatter.ts
  var MessageFormatter = class {
    constructor() {
      this.lastMessageHash = "";
      this.messageHistory = /* @__PURE__ */ new Set();
    }
    formatPrompt(userPrompt, selectedElements, pageInfo) {
      let formattedPrompt = `<userRequest>${userPrompt}</userRequest>`;
      const replacer = (_key, value) => {
        if (value === "" || Array.isArray(value) && value.length === 0 || value === null) {
          return void 0;
        }
        return value;
      };
      if (pageInfo) {
        formattedPrompt += `<pageInfo>${JSON.stringify(pageInfo, replacer)}</pageInfo>`;
      }
      if (selectedElements && selectedElements.length > 0) {
        formattedPrompt += `<inspectedElements>${JSON.stringify(selectedElements, replacer)}</inspectedElements>`;
      }
      return formattedPrompt;
    }
    shouldDisplayMessage(jsonData) {
      const messageHash = this.hashMessage(jsonData);
      if (messageHash === this.lastMessageHash) {
        return false;
      }
      if (jsonData.type === "assistant" && this.messageHistory.has(messageHash)) {
        return false;
      }
      this.lastMessageHash = messageHash;
      if (jsonData.type === "assistant") {
        this.messageHistory.add(messageHash);
        if (this.messageHistory.size > 10) {
          const firstHash = this.messageHistory.values().next().value;
          if (firstHash) {
            this.messageHistory.delete(firstHash);
          }
        }
      }
      return true;
    }
    formatClaudeMessage(data) {
      try {
        let content = "";
        let meta = "";
        let badge = "";
        if (data.type === "assistant" && data.message?.content) {
          const extracted = this.extractAssistantContent(data.message.content);
          content = extracted.text;
          badge = extracted.badge || "";
          if (data.message?.usage) {
            const usage = data.message.usage;
            meta = `${usage.input_tokens || 0}\u2191 ${usage.output_tokens || 0}\u2193`;
          }
        } else if (data.type === "user" && data.message?.content) {
          const extracted = this.extractUserContent(data.message.content);
          content = extracted.text;
          badge = extracted.badge || "";
        } else if (data.type === "system") {
          content = `System: ${data.subtype || "message"}`;
          badge = "\u2699\uFE0F System";
          if (data.cwd) meta = `${data.cwd}`;
        } else if (data.type === "result") {
          content = data.result || "Task completed";
          badge = "\u2705 Result";
          if (data.duration_ms) meta = `${data.duration_ms}ms`;
        } else {
          content = JSON.stringify(data, null, 1);
        }
        const badgeHtml = badge ? `<div class="message-badge">${HtmlUtils.escapeHtml(badge)}</div>` : "";
        return `<div class="message-wrapper">${badgeHtml}<div class="message-content">${HtmlUtils.escapeHtml(content)}</div>${meta ? `<div class="message-meta">${meta}</div>` : ""}</div>`;
      } catch (error) {
        console.error("Error formatting Claude message:", error);
        return `<div class="message-content">${HtmlUtils.escapeHtml(JSON.stringify(data))}</div>`;
      }
    }
    extractAssistantContent(content) {
      const items = content.map((item) => {
        if (item.type === "text") {
          return { text: item.text, badge: void 0 };
        } else if (item.type === "tool_use") {
          return {
            text: `${item.name}${item.input ? ": " + JSON.stringify(item.input).substring(0, 100) + "..." : ""}`,
            badge: "\u{1F527} Edit"
          };
        }
        return { text: "", badge: void 0 };
      }).filter((item) => item.text);
      if (items.length === 0) return { text: "" };
      const toolUseItem = items.find((item) => item.badge);
      if (toolUseItem) {
        return {
          text: items.map((item) => item.text).join("\n"),
          badge: toolUseItem.badge
        };
      }
      return { text: items.map((item) => item.text).join("\n") };
    }
    extractUserContent(content) {
      const items = content.map((item) => {
        if (item.type === "text") {
          return { text: item.text, badge: void 0 };
        } else if (item.type === "tool_result") {
          const result = typeof item.content === "string" ? item.content : JSON.stringify(item.content);
          return {
            text: `${result.substring(0, 150)}${result.length > 150 ? "..." : ""}`,
            badge: "\u{1F4E4} Tool result"
          };
        }
        return { text: "", badge: void 0 };
      }).filter((item) => item.text);
      if (items.length === 0) return { text: "" };
      const toolResultItem = items.find((item) => item.badge);
      if (toolResultItem) {
        return {
          text: items.map((item) => item.text).join("\n"),
          badge: toolResultItem.badge
        };
      }
      return { text: items.map((item) => item.text).join("\n") };
    }
    hashMessage(jsonData) {
      let content = "";
      if (jsonData.type === "assistant" && jsonData.message?.content) {
        content = this.extractAssistantContent(jsonData.message.content).text;
      } else if (jsonData.type === "user" && jsonData.message?.content) {
        content = this.extractUserContent(jsonData.message.content).text;
      } else {
        content = JSON.stringify(jsonData);
      }
      return HtmlUtils.hashString(content || "");
    }
    clearHistory() {
      this.lastMessageHash = "";
      this.messageHistory.clear();
    }
  };

  // src/inspector-toolbar.ts
  var InspectorToolbar = class extends HTMLElement {
    constructor() {
      super();
      this.isExpanded = false;
      this.isProcessing = false;
      // Managers
      this.selectionManager = new ElementSelectionManager();
      this.aiManager = new AIManager();
      this.messageFormatter = new MessageFormatter();
      this.attachShadow({ mode: "open" });
      this.inspectionManager = new InspectionManager(
        (element) => this.handleElementSelection(element),
        (element) => this.shouldIgnoreElement(element),
        (element) => this.selectionManager.hasElement(element)
      );
      this.render();
      this.attachEventListeners();
    }
    get aiEndpoint() {
      return this.getAttribute("ai-endpoint") || "";
    }
    set aiEndpoint(value) {
      if (value) {
        this.setAttribute("ai-endpoint", value);
      } else {
        this.removeAttribute("ai-endpoint");
      }
    }
    get cwd() {
      return this.getAttribute("cwd") || "";
    }
    set cwd(value) {
      if (value) {
        this.setAttribute("cwd", value);
      } else {
        this.removeAttribute("cwd");
      }
    }
    render() {
      if (!this.shadowRoot) return;
      this.shadowRoot.innerHTML = UIRenderer.renderToolbar();
    }
    attachEventListeners() {
      if (!this.shadowRoot) return;
      const toggleButton = this.shadowRoot.getElementById("toggleButton");
      const toolbarCard = this.shadowRoot.getElementById("toolbarCard");
      const inspectButton = this.shadowRoot.getElementById("inspectButton");
      const clearElementButton = this.shadowRoot.getElementById("clearElementButton");
      const closeInspectButton = this.shadowRoot.getElementById("closeInspectButton");
      const promptInput = this.shadowRoot.getElementById("promptInput");
      const newChatButton = this.shadowRoot.getElementById("newChatButton");
      const cancelButton = this.shadowRoot.getElementById("cancelButton");
      const jsonClearButton = this.shadowRoot.getElementById("jsonClearButton");
      toggleButton?.addEventListener("click", (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        this.isExpanded = !this.isExpanded;
        if (this.isExpanded) {
          toolbarCard?.classList.add("expanded");
          toggleButton.classList.add("active");
          if (this.selectionManager.getSelectedCount() === 0 && !this.inspectionManager.isInInspectionMode() && !this.isProcessing) {
            this.enterInspectionMode();
          }
        } else {
          toolbarCard?.classList.remove("expanded");
          toggleButton.classList.remove("active");
          if (this.inspectionManager.isInInspectionMode()) {
            this.exitInspectionMode();
          }
          this.selectionManager.clearAllSelections();
          this.clearJsonDisplay();
          if (promptInput) promptInput.value = "";
        }
      });
      document.addEventListener("click", (e) => {
        if (!this.contains(e.target) && this.isExpanded && !this.inspectionManager.isInInspectionMode()) {
          this.isExpanded = false;
          toolbarCard?.classList.remove("expanded");
          toggleButton?.classList.remove("active");
        }
      });
      inspectButton?.addEventListener("click", () => {
        if (!this.isProcessing) {
          this.enterInspectionMode();
        }
      });
      clearElementButton?.addEventListener("click", () => {
        this.selectionManager.clearAllSelections();
      });
      closeInspectButton?.addEventListener("click", () => {
        this.exitInspectionMode();
      });
      newChatButton?.addEventListener("click", async () => {
        if (promptInput) promptInput.value = "";
        this.selectionManager.clearAllSelections();
        this.clearJsonDisplay();
        if (!this.isProcessing) {
          this.enterInspectionMode();
        }
        if (this.aiManager.isInitialized()) {
          try {
            await this.aiManager.newChat();
            this.updateSessionDisplay();
          } catch (error) {
            console.error("Failed to start new chat:", error);
          }
        } else {
          console.warn("AI manager not initialized");
        }
      });
      cancelButton?.addEventListener("click", () => {
        if (this.aiManager.isProcessing()) {
          this.aiManager.cancel();
          this.setProcessingState(false);
          this.showNotification("Request cancelled", "success");
        }
      });
      jsonClearButton?.addEventListener("click", () => {
        this.clearJsonDisplay();
      });
      promptInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.handlePromptSubmit(promptInput.value.trim());
        }
      });
    }
    enterInspectionMode() {
      setTimeout(() => {
        const promptInput = this.shadowRoot?.getElementById("promptInput");
        promptInput?.focus();
      }, 100);
      this.inspectionManager.enterInspectionMode();
      this.shadowRoot?.querySelector(".toolbar-card")?.classList.add("inspecting");
    }
    exitInspectionMode() {
      this.inspectionManager.exitInspectionMode();
      this.shadowRoot?.querySelector(".toolbar-card")?.classList.remove("inspecting");
    }
    handleElementSelection(element) {
      if (this.selectionManager.hasElement(element)) {
        this.selectionManager.deselectElement(element);
      } else {
        this.selectionManager.selectElement(element, ComponentDetector.findNearestComponent);
      }
    }
    shouldIgnoreElement(element) {
      if (element === this || this.contains(element)) return true;
      if (element.classList?.contains("inspector-badge")) return true;
      let currentElement = element;
      while (currentElement) {
        if (currentElement.classList?.contains("inspector-badge") || currentElement.classList?.contains("inspector-ignore")) {
          return true;
        }
        const parent = currentElement.parentNode;
        if (parent && parent.nodeType === Node.ELEMENT_NODE) {
          currentElement = parent;
        } else if (currentElement.host) {
          currentElement = currentElement.host;
        } else {
          break;
        }
      }
      return false;
    }
    async handlePromptSubmit(prompt) {
      if (!prompt) {
        console.log("Empty prompt, nothing to process");
        return;
      }
      if (this.isProcessing) {
        console.log("Already processing, ignoring new prompt");
        return;
      }
      console.log("AI Prompt submitted:", prompt);
      console.log("Selected elements:", Array.from(this.selectionManager.getSelectedElements().keys()));
      if (this.inspectionManager.isInInspectionMode()) {
        this.exitInspectionMode();
      }
      const pageInfo = this.getCurrentPageInfo();
      const selectedElementsHierarchy = this.selectionManager.buildHierarchicalStructure(
        ComponentDetector.findNearestComponent
      );
      if (this.aiEndpoint) {
        await this.callAI(prompt, selectedElementsHierarchy, pageInfo);
      } else {
        console.warn("No AI endpoint provided. Set the ai-endpoint attribute to use AI features.");
      }
    }
    getCurrentPageInfo() {
      return {
        url: window.location.href,
        title: document.title
      };
    }
    async callAI(prompt, selectedElements, pageInfo) {
      if (!this.aiEndpoint) {
        console.warn("No AI endpoint specified");
        return;
      }
      const promptInput = this.shadowRoot?.getElementById("promptInput");
      const originalPromptText = promptInput?.value || "";
      try {
        if (!this.aiManager.isInitialized()) {
          throw new Error("AI manager not initialized");
        }
        this.setProcessingState(true);
        const messageHandler = {
          onData: (data) => {
            console.log("SSE data received:", data);
            if (data.type === "claude_json") {
              this.hideProcessingIndicator();
              this.displayJsonMessage(data.claudeJson);
            } else if (data.type === "complete") {
              console.log("AI request completed with session ID:", data.sessionId);
              if (promptInput) promptInput.value = "";
              this.setProcessingState(false);
            }
            if ((data.type === "complete" || data.type === "claude_response" || data.type === "claude_json") && data.sessionId) {
              this.updateSessionDisplay();
            }
          },
          onError: (error) => {
            console.error("AI subscription error:", error);
            this.showNotification("Failed to send message", "error");
            this.setProcessingState(false);
          },
          onComplete: () => {
            this.setProcessingState(false);
          }
        };
        await this.aiManager.sendMessage(
          prompt,
          selectedElements,
          pageInfo,
          this.cwd,
          messageHandler
        );
      } catch (error) {
        console.error("Error calling AI endpoint:", error);
        if (promptInput) promptInput.value = originalPromptText;
        this.setProcessingState(false);
        console.error("Error calling AI endpoint:", error.message || "Failed to connect to AI service");
      }
    }
    showNotification(message, type) {
      console.log(`${type}: ${message}`);
    }
    displayJsonMessage(jsonData) {
      const jsonDisplay = this.shadowRoot?.getElementById("jsonDisplay");
      const jsonContent = this.shadowRoot?.getElementById("jsonContent");
      if (!jsonDisplay || !jsonContent) return;
      if (!this.messageFormatter.shouldDisplayMessage(jsonData)) {
        return;
      }
      jsonDisplay.classList.add("show");
      const messageElement = document.createElement("div");
      messageElement.classList.add("json-message", jsonData.type || "generic");
      messageElement.innerHTML = this.messageFormatter.formatClaudeMessage(jsonData);
      jsonContent.appendChild(messageElement);
      jsonContent.scrollTop = jsonContent.scrollHeight;
    }
    clearJsonDisplay() {
      const jsonDisplay = this.shadowRoot?.getElementById("jsonDisplay");
      const jsonContent = this.shadowRoot?.getElementById("jsonContent");
      if (!jsonDisplay || !jsonContent) return;
      jsonContent.innerHTML = "";
      jsonDisplay.classList.remove("show");
      this.messageFormatter.clearHistory();
    }
    setProcessingState(isProcessing) {
      this.isProcessing = isProcessing;
      const toolbarCard = this.shadowRoot?.getElementById("toolbarCard");
      if (isProcessing) {
        toolbarCard?.classList.add("processing");
      } else {
        toolbarCard?.classList.remove("processing");
      }
      this.updateSessionDisplay();
    }
    hideProcessingIndicator() {
      const processingIndicator = this.shadowRoot?.getElementById("processingIndicator");
      if (processingIndicator) {
        processingIndicator.style.display = "none";
      }
    }
    updateSessionDisplay() {
      const sessionInfoElement = this.shadowRoot?.getElementById("sessionInfo");
      const sessionIdElement = this.shadowRoot?.getElementById("sessionId");
      const cancelButton = this.shadowRoot?.getElementById("cancelButton");
      if (sessionInfoElement && sessionIdElement) {
        const sessionId = this.aiManager.getSessionId();
        if (sessionId) {
          sessionInfoElement.style.display = "flex";
          sessionIdElement.textContent = sessionId.substring(0, 8);
          sessionIdElement.title = sessionId;
        } else {
          sessionInfoElement.style.display = "none";
        }
        if (cancelButton) {
          if (this.aiManager.isProcessing()) {
            cancelButton.style.display = "inline-flex";
          } else {
            cancelButton.style.display = "none";
          }
        }
      }
    }
    connectedCallback() {
      this.aiManager.initialize(this.aiEndpoint);
      this.updateSessionDisplay();
    }
    disconnectedCallback() {
      this.aiManager.destroy();
      this.inspectionManager.destroy();
      this.selectionManager.clearAllSelections();
    }
  };
  customElements.define("inspector-toolbar", InspectorToolbar);
})();
/*! Bundled license information:

@trpc/client/dist/httpBatchLink-CA96-gnJ.mjs:
  (* istanbul ignore if -- @preserve *)
*/
