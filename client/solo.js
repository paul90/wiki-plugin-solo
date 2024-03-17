
(function() {

  const delay = time => new Promise(res => setTimeout(res,time));

  function expand(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*(.+?)\*/g, '<i>$1</i>')
  }

  // https://github.com/bitinn/node-fetch/issues/481
  function absolute(url) {
    return url.replace(/^(https?:)\/([^\/])/,`$1//${location.host}/$2`)
  }

  function parse(text) {
    let graphs = []
    let output = text.split(/\r?\n/).map (line => {
      var m
      if (m = line.match(/^ASSETS$/)) {
        graphs.push(...assets())
      } else if (m = line.match(/^LINK (\w+) (https?:\S+.jsonl)$/)) {
        const graph = link(absolute(m[2]))
        graphs.push(graph)
        line = `LINK <a href="${absolute(m[2])}" target=_blank>${m[1]} <img src="/images/external-link-ltr-icon.png"></a>`
      } else {
        line = `<font color=gray>${expand(line)}</font>`
      }
      return line
    }).join('<br>')
    return {output, graphs}
  }

  async function assets() {
    const schedule = []
    return schedule
  }

  async function link(url) {
    const text = await fetch(url).then(res => res.text())
    const lines = text.trim().split(/\n/)
    return lines.map(line => JSON.parse(line))
  }


  let parsed
  let todo = []
  async function emit($item, item) {
    parsed = parse(item.text)
    $item.append(`<p style="background-color:#eee;padding:15px;">
      ${parsed.output}</p>`)
    todo = await Promise.all(parsed.graphs)
    $item.append(`<p>
      <button onclick="window.plugins.solo.dopopup(event)">view in solo</button></p>`)
  }

  const dopopup = event => {
    const graphs = todo.shift()
    todo.push(graphs)
    const doing = {type:'batch', graphs}
    const popup = window.open('/plugins/solo/dialog/#','solo','popup,height=720,width=1280')
    if (popup.location.pathname != '/plugins/solo/dialog/'){
      console.log('launching new dialog')
      popup.addEventListener('load', event => {
        console.log('launched and loaded')
        popup.postMessage(doing, window.origin)
      })
    }
    else {
      console.log('reusing existing dialog')
      popup.postMessage(doing, window.origin)
    }
  }

  // window.plugins.solo.dopopup = popup

  function bind($item, item) {
    return $item.dblclick(() => {
      return wiki.textEditor($item, item);
    })
  }


  function soloListener(event) {
    // only continue if event is from a solo popup.
    // events from a popup window will have an opener
    // ensure that the popup window is one of ours
    if (!event.source.opener || event.source.location.pathname !== '/plugins/solo/dialog/') {
      if (wiki.debug) {console.log('soloListener - not for us', {event})}
      return
    }
    if (wiki.debug) {console.log('soloListener - ours', {event})}

    const { data } = event
    const { action, keepLineup=false, pageKey=null, title=null, context=null } = data;

    let $page = null
    if (pageKey != null) {
      $page = keepLineup ? null : $('.page').filter((i, el) => $(el).data('key') == pageKey)
    }

    switch (action) {
      case 'doInternalLink':
        wiki.pageHandler.context = context
        wiki.doInternalLink(title, $page)
        break
      default:
        console.error({ where:'soloListener', message: "unknown action", data })
    }
  }

  if (typeof window !== "undefined" && window !== null) {
    // moduleLoaded = import('/plugins/graphviz/graphviz-viewer.js');
    // window.plugins.graphviz = {emit, bind};
    if (typeof window.soloListener !== "undefined" || window.soloListener == null) {
      console.log('**** Adding solo listener')
      window.soloListener = soloListener
      window.addEventListener("message", soloListener)
    }
  }

  if (typeof window !== "undefined" && window !== null) {
    window.plugins.solo = {emit, bind, dopopup}
  }

  if (typeof module !== "undefined" && module !== null) {
    module.exports = {expand}
  }

}).call(this)
