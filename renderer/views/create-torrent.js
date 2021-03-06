module.exports = CreateTorrentPage

var createTorrent = require('create-torrent')
var path = require('path')
var prettyBytes = require('prettier-bytes')

var {dispatch, dispatcher} = require('../lib/dispatcher')
var hx = require('../lib/hx')

function CreateTorrentPage (state) {
  var info = state.location.current()

  // Preprocess: exclude .DS_Store and other dotfiles
  var files = info.files
    .filter((f) => !f.name.startsWith('.'))
    .map((f) => ({name: f.name, path: f.path, size: f.size}))
  if (files.length === 0) return CreateTorrentErrorPage()

  // First, extract the base folder that the files are all in
  var pathPrefix = info.folderPath
  if (!pathPrefix) {
    pathPrefix = files.map((x) => x.path).reduce(findCommonPrefix)
    if (!pathPrefix.endsWith('/') && !pathPrefix.endsWith('\\')) {
      pathPrefix = path.dirname(pathPrefix)
    }
  }

  // Sanity check: show the number of files and total size
  var numFiles = files.length
  var totalBytes = files
    .map((f) => f.size)
    .reduce((a, b) => a + b, 0)
  var torrentInfo = `${numFiles} files, ${prettyBytes(totalBytes)}`

  // Then, use the name of the base folder (or sole file, for a single file torrent)
  // as the default name. Show all files relative to the base folder.
  var defaultName, basePath
  if (files.length === 1) {
    // Single file torrent: /a/b/foo.jpg -> torrent name "foo.jpg", path "/a/b"
    defaultName = files[0].name
    basePath = pathPrefix
  } else {
    // Multi file torrent: /a/b/{foo, bar}.jpg -> torrent name "b", path "/a"
    defaultName = path.basename(pathPrefix)
    basePath = path.dirname(pathPrefix)
  }
  var maxFileElems = 100
  var fileElems = files.slice(0, maxFileElems).map(function (file) {
    var relativePath = files.length === 0 ? file.name : path.relative(pathPrefix, file.path)
    return hx`<div>${relativePath}</div>`
  })
  if (files.length > maxFileElems) {
    fileElems.push(hx`<div>+ ${maxFileElems - files.length} more</div>`)
  }
  var trackers = createTorrent.announceList.join('\n')
  var collapsedClass = info.showAdvanced ? 'expanded' : 'collapsed'

  return hx`
    <div class='create-torrent'>
      <h2>Create torrent ${defaultName}</h2>
      <p class="torrent-info">
        ${torrentInfo}
      </p>
      <p class='torrent-attribute'>
        <label>Path:</label>
        <div class='torrent-attribute'>${pathPrefix}</div>
      </p>
      <div class='expand-collapse ${collapsedClass}'
           onclick=${dispatcher('toggleCreateTorrentAdvanced')}>
        ${info.showAdvanced ? 'Basic' : 'Advanced'}
      </div>
      <div class="create-torrent-advanced ${collapsedClass}">
        <p class='torrent-attribute'>
          <label>Comment:</label>
          <textarea class='torrent-attribute torrent-comment'></textarea>
        </p>
        <p class='torrent-attribute'>
          <label>Trackers:</label>
          <textarea class='torrent-attribute torrent-trackers'>${trackers}</textarea>
        </p>
        <p class='torrent-attribute'>
          <label>Private:</label>
          <input type='checkbox' class='torrent-is-private' value='torrent-is-private'>
        </p>
        <p class='torrent-attribute'>
          <label>Files:</label>
          <div>${fileElems}</div>
        </p>
      </div>
      <p class="float-right">
        <button class='button-flat light' onclick=${dispatcher('back')}>Cancel</button>
        <button class='button-raised' onclick=${handleOK}>Create Torrent</button>
      </p>
    </div>
  `

  function handleOK () {
    var announceList = document.querySelector('.torrent-trackers').value
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s !== '')
    var isPrivate = document.querySelector('.torrent-is-private').checked
    var comment = document.querySelector('.torrent-comment').value.trim()
    var options = {
      // We can't let the user choose their own name if we want WebTorrent
      // to use the files in place rather than creating a new folder.
      // If we ever want to add support for that:
      // name: document.querySelector('.torrent-name').value
      name: defaultName,
      path: basePath,
      files: files,
      announce: announceList,
      private: isPrivate,
      comment: comment
    }
    dispatch('createTorrent', options)
  }
}

function CreateTorrentErrorPage () {
  return hx`
    <div class='create-torrent'>
      <h2>Create torrent</h2>
      <p class="torrent-info">
        <p>
          Sorry, you must select at least one file that is not a hidden file.
        </p>
        <p>
          Hidden files, starting with a . character, are not included.
        </p>
      </p>
      <p class="float-right">
        <button class='button-flat light' onclick=${dispatcher('back')}>
          Cancel
        </button>
      </p>
    </div>
  `
}

// Finds the longest common prefix
function findCommonPrefix (a, b) {
  for (var i = 0; i < a.length && i < b.length; i++) {
    if (a.charCodeAt(i) !== b.charCodeAt(i)) break
  }
  if (i === a.length) return a
  if (i === b.length) return b
  return a.substring(0, i)
}
