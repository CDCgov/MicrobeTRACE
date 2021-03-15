(function(){
  ga('set', 'page', '/waterfall');
  ga('set', 'title', 'Waterfall View');
  ga('send', 'pageview');

  let meta = ['index', 'id', 'visible', 'degree', '_diff', 'seq', 'cluster', 'directed', 'source', 'target'];

  function resetClusters(){
    resetNodes();
    let list = $('#waterfall-cluster-list').empty();
    session.data.clusters.forEach(cluster => {
      if(!cluster.visible || cluster.nodes == 1) return;
      $(`<a href="#" class="list-group-item list-group-item-action">
        <div class="d-flex w-100 justify-content-between">
          <span>${cluster.id}</span>
          <small>${cluster.nodes}</small>
        </div>
        <div class="hideIfNotActive">
          Links: ${cluster.links}<br>
          Links per Node: ${cluster.links_per_node.toLocaleString()}<br>
          Average Distance: ${cluster.mean_genetic_distance.toLocaleString()}
        </div>
      </a>`).click(function(){
        let wasActive = false;
        if($(this).hasClass('active')) wasActive = true;
        list.find('a').removeClass('active');
        if(!wasActive){
          $(this).addClass('active');
          resetNodes(cluster.id);
        } else {
          resetNodes();
        }
      }).appendTo(list);
    });
  }

  function resetNodes(cluster){
    resetNeighbors();
    let list = $('#waterfall-node-list').empty();
    if(typeof cluster == 'undefined') return;
    session.data.nodes.forEach(node => {
      if(node.cluster !== cluster) return;
      $(`<a href="#" class="list-group-item list-group-item-action">
        <div class="d-flex w-100 justify-content-between">
          <span class="ellipsisToFit">${'_id' in node ? node._id : node.id}</span>
          <small>${node.degree}</small>
        </div>
        <div class="hideIfNotActive">
          ${Object.keys(node).filter(k => !meta.includes(k)).map(k => MT.titleize(k) + ': ' + node[k]).join('<br>')}
        </div>
      </a>`).click(function(){
        let wasActive = false;
        if($(this).hasClass('active')) wasActive = true;
        list.find('a').removeClass('active');
        if(!wasActive){
          $(this).addClass('active');
          resetNeighbors(node);
        } else {
          resetNeighbors();
        }
      }).appendTo(list);
    });
  }

  function resetNeighbors(node){
    let list = $('#waterfall-neighbor-list').empty();
    if(typeof node == 'undefined') return;
    let lsv = session.style.widgets['link-sort-variable'];
    let labels = Object.keys(temp.matrix);
    const n = labels.length;
    let row = temp.matrix['_id' in node ? node._id : node.id];
    for(let i = 0; i < n; i++){
      let neighbor = labels[i];
      let link = row[neighbor];
      if(!link) continue;
      if(!link.visible) continue;
      $(`<a href="#" class="list-group-item list-group-item-action">
        <div class="d-flex w-100 justify-content-between">
          <span class="ellipsisToFit">${neighbor}</span>
          <small>${link[lsv].toLocaleString()}</small>
        </div>
        <div class="hideIfNotActive">
          ${Object.keys(link).filter(k => !meta.includes(k)).map(k => MT.titleize(k) + ': ' + (typeof link[k] == 'number' ? link[k].toLocaleString() : link[k])).join('\n<br>')}
        </div>
      </a>`).on('click', function(){
        let wasActive = false;
        if($(this).hasClass('active')) wasActive = true;
        list.find('a').removeClass('active');
        if(!wasActive) $(this).addClass('active');
      }).appendTo(list);
    }
  }

  $('#waterfall').parent()
    .css('overflow-y', 'scroll')
    .css('z-index', 1000);

  resetClusters();

  $window
    .on('background-color-change', function(){
      $('#waterfall').css('background-color', session.style.widgets['background-color']);
    })
    .on('link-visibility node-visibility node-selected', resetClusters);
})();