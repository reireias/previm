'use strict';

(function(_doc, _win) {
  var REFRESH_INTERVAL = 1000;
  var md = new _win.markdownit({html: true, linkify: true})
                   .use(_win.markdownitAbbr)
                   .use(_win.markdownitDeflist)
                   .use(_win.markdownitFootnote)
                   .use(_win.markdownitSub)
                   .use(_win.markdownitSup);

  // Override default 'fence' ruler for 'mermaid' support
  var original_fence = md.renderer.rules.fence;
  md.renderer.rules.fence = function fence(tokens, idx, options, env, slf) {
    var token = tokens[idx];
    var langName = token.info.trim().split(/\s+/g)[0];
    if (langName === 'mermaid') {
      return '<div class="mermaid">' + token.content + '</div>';
    }
    return original_fence(tokens, idx, options, env, slf);
  };

  function transform(filetype, content) {
    if(hasTargetFileType(filetype, ['markdown', 'mkd'])) {
      return md.render(content);
    } else if(hasTargetFileType(filetype, ['rst'])) {
      // It has already been converted by rst2html.py
      return content;
    } else if(hasTargetFileType(filetype, ['textile'])) {
      return textile(content);
    }
    return 'Sorry. It is a filetype(' + filetype + ') that is not support<br /><br />' + content;
  }

  function hasTargetFileType(filetype, targetList) {
    var ftlist = filetype.split('.');
    for(var i=0;i<ftlist.length; i++) {
      if(targetList.indexOf(ftlist[i]) > -1){
        return true;
      }
    }
    return false;
  }

  // NOTE: Experimental
  //   ここで動的にpageYOffsetを取得すると画像表示前の高さになってしまう
  //   そのため明示的にpageYOffsetを受け取るようにしている
  function autoScroll(id, pageYOffset) {
    var relaxed = 0.95;
    var obj = document.getElementById(id);
    if((_doc.documentElement.clientHeight + pageYOffset) / _doc.body.clientHeight > relaxed) {
      obj.scrollTop = obj.scrollHeight;
    } else {
      obj.scrollTop = pageYOffset;
    }
  }

  function style_header() {
    if (typeof isShowHeader === 'function') {
      var style = isShowHeader() ? '' : 'none';
      _doc.getElementById('header').style.display = style;
    }
  }

  function createOutline() {
    var outline = _doc.getElementById('outline'),
        h2tags = _doc.getElementsByTagName('h2'),
        h3tags = _doc.getElementsByTagName('h3'),
        tags = [],
        ul;
    for (var i = 0; i < h2tags.length; i++) {
      var h2 = h2tags[i];
      h2.id = 'h2-' + i;
      tags.push({
        tag: 'h2',
        id: h2.id,
        text: h2.innerText,
        offsetTop: h2.offsetTop
      });
    }
    for (var i = 0; i < h3tags.length; i++) {
      var h3 = h3tags[i];
      h3.id = 'h3-' + i;
      tags.push({
        tag: 'h3',
        id: h3.id,
        text: h3.innerText,
        offsetTop: h3.offsetTop
      });
    }
    tags.sort(function(a, b) {
      return a.offsetTop - b.offsetTop;
    });

    ul = _doc.getElementById('outline-menu');
    if (ul) {
      ul.parentNode.removeChild(ul);
    }
    ul = _doc.createElement('ul');
    ul.id = 'outline-menu';

    for (var tag of tags) {
      var li = _doc.createElement('li'),
          a = _doc.createElement('a'),
          text;
      text = tag.tag == 'h2' ? '' + tag.text : '\u00a0\u00a0\u00a0\u00a0' + tag.text;
      a.setAttribute('href', '#' + tag.id);
      a.appendChild(_doc.createTextNode(text));
      li.appendChild(a);
      ul.appendChild(li);
    }

    outline.appendChild(ul);
    if (_win.innerWidth < 1800) {
      outline.setAttribute('style', 'display: none;');
    }
  }

  function loadPreview() {
    var needReload = false;
    // These functions are defined as the file generated dynamically.
    //   generator-file: preview/autoload/previm.vim
    //   generated-file: preview/js/previm-function.js
    if (typeof getFileName === 'function') {
      if (_doc.getElementById('markdown-file-name').innerHTML !== getFileName()) {
        _doc.getElementById('markdown-file-name').innerHTML = getFileName();
        needReload = true;
      }
    } else {
      needReload = true;
    }
    if (typeof getLastModified === 'function') {
      if (_doc.getElementById('last-modified').innerHTML !== getLastModified()) {
        _doc.getElementById('last-modified').innerHTML = getLastModified();
        needReload = true;
      }
    } else {
      needReload = true;
    }
    if (needReload && (typeof getContent === 'function') && (typeof getFileType === 'function')) {
      var beforePageYOffset = _win.pageYOffset;
      _doc.getElementById('preview').innerHTML = transform(getFileType(), getContent());

      mermaid.init();
      Array.prototype.forEach.call(_doc.querySelectorAll('pre code'), hljs.highlightBlock);
      autoScroll('body', beforePageYOffset);
      style_header();
      createOutline();
    }
  }

  _win.setInterval(function() {
    var script = _doc.createElement('script');

    script.type = 'text/javascript';
    script.src = 'js/previm-function.js?t=' + new Date().getTime();

    _addEventListener(script, 'load', (function() {
      loadPreview();
      _win.setTimeout(function() {
        script.parentNode.removeChild(script);
      }, 160);
    })());

    _doc.getElementsByTagName('head')[0].appendChild(script);

  }, REFRESH_INTERVAL);

  function _addEventListener(target, type, listener) {
    if (target.addEventListener) {
      target.addEventListener(type, listener, false);
    } else if (target.attachEvent) {
      // for IE6 - IE8
      target.attachEvent('on' + type, function() { listener.apply(target, arguments); });
    } else {
      // do nothing
    }
  }

  loadPreview();
})(document, window);
