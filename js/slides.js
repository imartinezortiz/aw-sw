var mergeHTMLPlugin = (function () {
    'use strict';
  
    var originalStream;
  
    /**
     * @param {string} value
     * @returns {string}
     */
    function escapeHTML(value) {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }
  
    /* plugin itself */
  
    /** @type {HLJSPlugin} */
    const mergeHTMLPlugin = {
      // preserve the original HTML token stream
      "before:highlightElement": ({ el }) => {
        originalStream = nodeStream(el);
      },
      // merge it afterwards with the highlighted token stream
      "after:highlightElement": ({ el, result, text }) => {
        if (!originalStream.length) return;
  
        const resultNode = document.createElement('div');
        resultNode.innerHTML = result.value;
        result.value = mergeStreams(originalStream, nodeStream(resultNode), text);
        el.innerHTML = result.value;
      }
    };
  
    /* Stream merging support functions */
  
    /**
     * @typedef Event
     * @property {'start'|'stop'} event
     * @property {number} offset
     * @property {Node} node
     */
  
    /**
     * @param {Node} node
     */
    function tag(node) {
      return node.nodeName.toLowerCase();
    }
  
    /**
     * @param {Node} node
     */
    function nodeStream(node) {
      /** @type Event[] */
      const result = [];
      (function _nodeStream(node, offset) {
        for (let child = node.firstChild; child; child = child.nextSibling) {
          if (child.nodeType === 3) {
            offset += child.nodeValue.length;
          } else if (child.nodeType === 1) {
            result.push({
              event: 'start',
              offset: offset,
              node: child
            });
            offset = _nodeStream(child, offset);
            // Prevent void elements from having an end tag that would actually
            // double them in the output. There are more void elements in HTML
            // but we list only those realistically expected in code display.
            if (!tag(child).match(/br|hr|img|input/)) {
              result.push({
                event: 'stop',
                offset: offset,
                node: child
              });
            }
          }
        }
        return offset;
      })(node, 0);
      return result;
    }
  
    /**
     * @param {any} original - the original stream
     * @param {any} highlighted - stream of the highlighted source
     * @param {string} value - the original source itself
     */
    function mergeStreams(original, highlighted, value) {
      let processed = 0;
      let result = '';
      const nodeStack = [];
  
      function selectStream() {
        if (!original.length || !highlighted.length) {
          return original.length ? original : highlighted;
        }
        if (original[0].offset !== highlighted[0].offset) {
          return (original[0].offset < highlighted[0].offset) ? original : highlighted;
        }
  
        /*
        To avoid starting the stream just before it should stop the order is
        ensured that original always starts first and closes last:
  
        if (event1 == 'start' && event2 == 'start')
          return original;
        if (event1 == 'start' && event2 == 'stop')
          return highlighted;
        if (event1 == 'stop' && event2 == 'start')
          return original;
        if (event1 == 'stop' && event2 == 'stop')
          return highlighted;
  
        ... which is collapsed to:
        */
        return highlighted[0].event === 'start' ? original : highlighted;
      }
  
      /**
       * @param {Node} node
       */
      function open(node) {
        /** @param {Attr} attr */
        function attributeString(attr) {
          return ' ' + attr.nodeName + '="' + escapeHTML(attr.value) + '"';
        }
        // @ts-ignore
        result += '<' + tag(node) + [].map.call(node.attributes, attributeString).join('') + '>';
      }
  
      /**
       * @param {Node} node
       */
      function close(node) {
        result += '</' + tag(node) + '>';
      }
  
      /**
       * @param {Event} event
       */
      function render(event) {
        (event.event === 'start' ? open : close)(event.node);
      }
  
      while (original.length || highlighted.length) {
        let stream = selectStream();
        result += escapeHTML(value.substring(processed, stream[0].offset));
        processed = stream[0].offset;
        if (stream === original) {
          /*
          On any opening or closing tag of the original markup we first close
          the entire highlighted node stack, then render the original tag along
          with all the following original tags at the same offset and then
          reopen all the tags on the highlighted stack.
          */
          nodeStack.reverse().forEach(close);
          do {
            render(stream.splice(0, 1)[0]);
            stream = selectStream();
          } while (stream === original && stream.length && stream[0].offset === processed);
          nodeStack.reverse().forEach(open);
        } else {
          if (stream[0].event === 'start') {
            nodeStack.push(stream[0].node);
          } else {
            nodeStack.pop();
          }
          render(stream.splice(0, 1)[0]);
        }
      }
      return result + escapeHTML(value.substring(processed));
    }
  
    return mergeHTMLPlugin;
  
  }());


const menu = {
    // Specifies which side of the presentation the menu will
    // be shown. Use 'left' or 'right'.
    side: 'left',
 
    // Specifies the width of the menu.
    // Can be one of the following:
    // 'normal', 'wide', 'third', 'half', 'full', or
    // any valid css length value
    width: 'normal',
 
    // Add slide numbers to the titles in the slide list.
    // Use 'true' or format string (same as reveal.js slide numbers)
    numbers: false,
 
    // Specifies which slide elements will be used for generating
    // the slide titles in the menu. The default selects the first
    // heading element found in the slide, but you can specify any
    // valid css selector and the text from the first matching
    // element will be used.
    // Note: that a section data-menu-title attribute or an element
    // with a menu-title class will take precedence over this option
    titleSelector: 'h1, h2, h3, h4, h5, h6',
 
    // If slides do not have a matching title, attempt to use the
    // start of the text content as the title instead
    useTextContentForMissingTitles: false,
 
    // Hide slides from the menu that do not have a title.
    // Set to 'true' to only list slides with titles.
    hideMissingTitles: false,
 
    // Adds markers to the slide titles to indicate the
    // progress through the presentation. Set to 'false'
    // to hide the markers.
    markers: true,
 
    // Specify custom panels to be included in the menu, by
    // providing an array of objects with 'title', 'icon'
    // properties, and either a 'src' or 'content' property.
    custom: false,
 
    // Specifies the themes that will be available in the themes
    // menu panel. Set to 'true' to show the themes menu panel
    // with the default themes list. Alternatively, provide an
    // array to specify the themes to make available in the
    // themes menu panel, for example...
    //
    // [
    //     { name: 'Black', theme: 'dist/theme/black.css' },
    //     { name: 'White', theme: 'dist/theme/white.css' },
    //     { name: 'League', theme: 'dist/theme/league.css' },
    //     {
    //       name: 'Dark',
    //       theme: 'lib/reveal.js/dist/theme/black.css',
    //       highlightTheme: 'lib/reveal.js/plugin/highlight/monokai.css'
    //     },
    //     {
    //       name: 'Code: Zenburn',
    //       highlightTheme: 'lib/reveal.js/plugin/highlight/zenburn.css'
    //     }
    // ]
    //
    // Note: specifying highlightTheme without a theme will
    // change the code highlight theme while leaving the
    // presentation theme unchanged.
    themes: false,
 
    // Specifies the path to the default theme files. If your
    // presentation uses a different path to the standard reveal
    // layout then you need to provide this option, but only
    // when 'themes' is set to 'true'. If you provide your own
    // list of themes or 'themes' is set to 'false' the
    // 'themesPath' option is ignored.
    themesPath: 'theme/',
 
    // Specifies if the transitions menu panel will be shown.
    // Set to 'true' to show the transitions menu panel with
    // the default transitions list. Alternatively, provide an
    // array to specify the transitions to make available in
    // the transitions panel, for example...
    // ['None', 'Fade', 'Slide']
    transitions: false,
 
    // Adds a menu button to the slides to open the menu panel.
    // Set to 'false' to hide the button.
    openButton: true,
 
    // If 'true' allows the slide number in the presentation to
    // open the menu panel. The reveal.js slideNumber option must
    // be displayed for this to take effect
    openSlideNumber: false,
 
    // If true allows the user to open and navigate the menu using
    // the keyboard. Standard keyboard interaction with reveal
    // will be disabled while the menu is open.
    keyboard: true,
 
    // Normally the menu will close on user actions such as
    // selecting a menu item, or clicking the presentation area.
    // If 'true', the sticky option will leave the menu open
    // until it is explicitly closed, that is, using the close
    // button or pressing the ESC or m key (when the keyboard
    // interaction option is enabled).
    sticky: false,
 
    // If 'true' standard menu items will be automatically opened
    // when navigating using the keyboard. Note: this only takes
    // effect when both the 'keyboard' and 'sticky' options are enabled.
    autoOpen: true,
 
    // If 'true' the menu will not be created until it is explicitly
    // requested by calling RevealMenu.init(). Note this will delay
    // the creation of all menu panels, including custom panels, and
    // the menu button.
    delayInit: false,
 
    // If 'true' the menu will be shown when the menu is initialised.
    openOnInit: false,
 
    // By default the menu will load it's own font-awesome library
    // icons. If your presentation needs to load a different
    // font-awesome library the 'loadIcons' option can be set to false
    // and the menu will not attempt to load the font-awesome library.
    loadIcons: true,

    path: '../revealjs/plugin/menu/',
};

Reveal.initialize({
    // Display presentation control arrows
    controls: true,
    // Display a presentation progress bar
    progress: true,
    // Display the page number of the current slide
    // - true:    Show slide number
    // - false:   Hide slide number
    //
    // Can optionally be set as a string that specifies the number formatting:
    // - "h.v":   Horizontal . vertical slide number (default)
    // - "h/v":   Horizontal / vertical slide number
    // - "c":   Flattened slide number
    // - "c/t":   Flattened slide number / total slides
    //
    // Alternatively, you can provide a function that returns the slide
    // number for the current slide. The function should take in a slide
    // object and return an array with one string [slideNumber] or
    // three strings [n1,delimiter,n2]. See #formatSlideNumber().
    slideNumber: false,
    history: true,
    center: true,
    menu: menu,
    plugins: [ RevealNotes, RevealHighlight, RevealMath, RevealZoom, RevealMenu ],
//    plugins: [ Notes, Highlight, Zoom ],
    width: 1280,
    height: 720,
    // https://revealjs.com/pdf-export/
    pdfMaxPagesPerSlide: 1,
    pdfSeparateFragments: false,
    keyboard: {
        33: 'left',
        34: 'right'
    },
    highlight : {
        beforeHighlight: function (hljs) {
            hljs.addPlugin(mergeHTMLPlugin);
        }
    }
});

Reveal.on('ready', (event) => {
    let background = document.querySelectorAll('.slide-background').forEach((slide, key, parent) => {
        const headerTemplate = document.querySelector('#header');
        const footerTemplate = document.querySelector('#footer');
        if (headerTemplate) {
            slide.appendChild(headerTemplate.content.cloneNode(true));
        }
        if (footerTemplate ) {
            slide.appendChild(footerTemplate.content.cloneNode(true));
        }
    })
});
Reveal.on('pdf-ready', (event) => {
    document.querySelectorAll('.pdf-page').forEach(page => {
        const headerTemplate = document.querySelector('#header');
        const footerTemplate = document.querySelector('#footer');

        if (headerTemplate) {
            page.appendChild(headerTemplate.content.cloneNode(true));
        }
        if (footerTemplate ) {
            page.appendChild(footerTemplate.content.cloneNode(true));
        }
    });
})
