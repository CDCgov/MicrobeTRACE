(function () {
  ga('set', 'page', '/geo_map');
  ga('set', 'title', 'Geo Map View');
  ga('send', 'pageview');

  // save existing session styles
  temp.mapData['map-countries-show'] = session.style.widgets['map-countries-show'];
  temp.mapData['map-states-show'] = session.style.widgets['map-states-show'];
  temp.mapData['map-counties-show'] = session.style.widgets['map-counties-show'];
  temp.mapData['map-basemap-show'] = session.style.widgets['map-basemap-show'];
  temp.mapData['map-satellite-show'] = session.style.widgets['map-satellite-show'];
  session.style.widgets['map-countries-show']= true;
  session.style.widgets['map-states-show']= true;
  session.style.widgets['map-counties-show']= false;
  session.style.widgets['map-basemap-show']= false;
  session.style.widgets['map-satellite-show']= false;    
  
  if (navigator.onLine) {
    $('#map').parent().find('.ifOnline').css('display', 'flex');
  }

  var layers = {
    basemap: L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYWFib3lsZXMiLCJhIjoiY2o4b3QxNmtjMDhwNjMzcno4dDd1NnVraSJ9.BkjEa6NM7o7KeTaTHOaIGg'),
    satellite: L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYWFib3lsZXMiLCJhIjoiY2o4b3QxNmtjMDhwNjMzcno4dDd1NnVraSJ9.BkjEa6NM7o7KeTaTHOaIGg'),
    nodes: { remove: function () { return null; } },
    links: { remove: function () { return null; } }
  };

  var nodes = [];

  function getMapData(type, callback) {
    var name = type.split('.')[0];
    MT.getMapData(type).then(data => {
      if (['countries', 'states', 'counties'].includes(name)) {
        layers[name] = L.geoJSON(data, {
          color: '#dadde0',
          weight: name == 'countries' ? 1 : 0.5,
          fillColor: '#fafaf8',
          fillOpacity: name == 'countries' ? 1 : 0
        });
      }
      if (callback) callback();
    })
  }

  var map = L.map('map', {
    center: [80, 0],
    zoom: 3,
    zoomControl: false,
    maxZoom: 20,
    preferCanvas: true
  });

  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  ['lat', 'lon', 'tract', 'zipcode', 'county', 'state', 'country'].forEach(v => {
    var name = 'map-field-' + v, s = $('#' + name);
    s.on('change', function (e) {
      session.style.widgets[name] = e.target.value;
      matchCoordinates(function () {
        rerollNodes();
        drawNodes();
        drawLinks();
        resetStack();
      });
    });
    if (session.data.nodeFields.includes(v)) s.val(v);
  });

  function matchCoordinates(callback, norefresh) {
    if (!norefresh) nodes = MT.getVisibleNodes();
    if (session.style.widgets['map-field-country'] !== 'None') {
      if (!temp.mapData.countries) {
        getMapData('countries.json', () => matchCoordinates(callback, true));
        return;
      }
      var val = session.style.widgets['map-field-country'];
      nodes.forEach(n => {
        var country = temp.mapData.countries.features.find(c => c.id == n[val] || c.properties.name == n[val]);
        if (country) {
          n._lat = country.properties._lat,
            n._lon = country.properties._lon
        }
      });
    }
    if (session.style.widgets['map-field-state'] !== 'None') {
      if (!temp.mapData.states) {
        getMapData('states.json', () => matchCoordinates(callback, true));
        return;
      }
      var sval = session.style.widgets['map-field-state'];
      nodes.forEach(n => {
        var state = temp.mapData.states.features.find(s => s.properties.usps == n[sval] || s.properties.name == n[sval]);
        if (state) {
          n._lat = state.properties._lat;
          n._lon = state.properties._lon;
        }
      });
    }
    if (session.style.widgets['map-field-county'] !== 'None') {
      if (!temp.mapData.counties) {
        getMapData('counties.json', () => matchCoordinates(callback, true));
        return;
      }
      var sval = session.style.widgets['map-field-state'];
      var cval = session.style.widgets['map-field-county'];
      nodes.forEach(n => {
        var county;
        county = temp.mapData.counties.features.find(c => {
          return (c.properties.fips == n[cval] ||
            parseFloat(c.properties.fips) == parseFloat(n[cval]));
        });
        if (county) {
          n._lat = county.properties._lat;
          n._lon = county.properties._lon;
          return;
        }
        var state = temp.mapData.states.features.find(s => s.properties.usps == n[sval].toUpperCase() || s.properties.name.toLowerCase().includes(n[sval].toLowerCase()));
        county = temp.mapData.counties.features.find(c => {
          var small = n[cval].toLowerCase();
          return c.properties.state == state.properties.usps && (
            c.properties.name.includes(small) ||
            small.includes(c.properties.name)
          );
        });
        if (county) {
          n._lat = county.properties._lat;
          n._lon = county.properties._lon;
        }
      });
    }
    if (session.style.widgets['map-field-zipcode'] !== 'None') {
      if (!temp.mapData.zipcodes) {
        getMapData('zipcodes.csv', () => matchCoordinates(callback, true));
        return;
      }
      var val = session.style.widgets['map-field-zipcode'];
      nodes.forEach(n => {
        var zo = temp.mapData.zipcodes.find(z => z.zipcode == n[val]);
        if (zo) {
          n._lat = zo._lat;
          n._lon = zo._lon;
        }
      });
    }
    if (session.style.widgets['map-field-tract'] !== 'None') {
      if (!temp.mapData.tracts) {
        getMapData('tracts.csv', () => matchCoordinates(callback, true));
        return;
      }
      var val = session.style.widgets['map-field-tract'];
      nodes.forEach(n => {
        var tract = temp.mapData.tracts.find(t => t.tract == n[val]);
        if (tract) {
          n._lat = tract._lat;
          n._lon = tract._lon;
        }
      });
    }
    if (session.style.widgets['map-field-lat'] !== 'None' && session.style.widgets['map-field-lon'] !== 'None') {
      var lat = session.style.widgets['map-field-lat'],
        lon = session.style.widgets['map-field-lon'];
      nodes.forEach(n => {
        if (typeof n[lat] == 'string') {
          n._lat = (n[lat].includes('S') ? -1 : 1) * parseFloat(n[lat]);
        } else {
          n._lat = n[lat];
        }
        if (typeof n[lon] == 'string') {
          n._lon = (n[lon].includes('W') ? -1 : 1) * parseFloat(n[lon]);
        } else {
          n._lon = n[lon];
        }
      });
    }
    if (callback) callback();
  }

  function drawNodes() {
    if(!$('#map').length) return;
    layers.nodes.remove();
    if (!session.style.widgets['map-node-show']) return;
    var fillcolor = session.style.widgets['node-color'],
      colorVariable = session.style.widgets['node-color-variable'],
      selectedColor = session.style.widgets['selected-color'],
      opacity = 1 - session.style.widgets['map-node-transparency'];
    var features = [];
    var n = nodes.length;
    for (var i = 0; i < n; i++) {
      var d = nodes[i];
      if (!d._jlat || !d._jlon) continue;
      features.push(L.circleMarker(L.latLng(d._jlat, d._jlon), {
        weight: 1,
        opacity: opacity,
        color: d.selected ? selectedColor : '#000000',
        fillColor: colorVariable == 'None' ? fillcolor : temp.style.nodeColorMap(d[colorVariable]),
        fillOpacity: opacity,
        data: d
      }));
    }
    if (session.style.widgets['map-collapsing-on']) {
      layers.nodes = L.markerClusterGroup({
        maxClusterRadius: 20,
        spiderLegPolylineOptions: { opacity: 0 }
      });
      layers.nodes.addLayers(features);
    } else {
      layers.nodes = L.featureGroup(features);
    }

    layers.nodes
      .on('mouseover', showNodeTooltip)
      .on('mouseout', hideTooltip)
      .on('click', clickHandler)
      .addTo(map).bringToFront();
  }

  function drawLinks() {
    if(!$('#map').length) return;
    layers.links.remove();
    if (!session.style.widgets['map-link-show']) return;
    var lcv = session.style.widgets['link-color-variable'];
    var opacity = 1 - session.style.widgets['map-link-transparency'];
    var links = MT.getVisibleLinks();
    layers.links = L.featureGroup();
    links.forEach(function (d) {
      if (!d.visible) return;
      var source = nodes.find(node => node._id == d.source);
      var target = nodes.find(node => node._id == d.target);
      if (source && target) {
        if (source._jlat && source._jlon && target._jlat && target._jlon) {
          layers.links.addLayer(L.polyline([[
            [source._jlat, source._jlon],
            [target._jlat, target._jlon]
          ]], {
              color: lcv == "None" ?
                session.style.widgets['link-color'] :
                temp.style.linkColorMap(d[lcv]),
              opacity: opacity,
              data: d
            }));
        }
      }
    });
    layers.links
      .on('mouseover', showLinkTooltip)
      .on('mouseout', hideTooltip)
      .addTo(map);
  }

  function showNodeTooltip(e) {
    var d = e.layer.options.data;
    var v = session.style.widgets['map-node-tooltip-variable'];
    if (v !== 'None' && d[v]) {
      d3.select('#tooltip')
        .html(d[v])
        .style('left', (e.originalEvent.pageX + 8) + 'px')
        .style('top', (e.originalEvent.pageY + 18) + 'px')
        .style('z-index', 1001)
        .transition().duration(100)
        .style('opacity', 1);
    }
  }

  function showLinkTooltip(e) {
    var d = e.layer.options.data;
    var v = session.style.widgets['map-link-tooltip-variable'];
    if (v !== 'None' && d[v]) {
      d3.select('#tooltip')
        .html(d[v])
        .style('left', (e.originalEvent.pageX + 8) + 'px')
        .style('top', (e.originalEvent.pageY + 18) + 'px')
        .style('z-index', 1001)
        .transition().duration(100)
        .style('opacity', 1);
    }
  }

  function hideTooltip() {
    var tooltip = d3.select('#tooltip');
    tooltip
      .transition().duration(100)
      .style('opacity', 0)
      .on('end', () => tooltip.style('z-index', -1));
  }

  function clickHandler(e) {
    var node = e.sourceTarget.feature.properties;
    var d = session.data.nodes.find(d => d.id == node._id);
    if (!e.originalEvent.ctrlKey) {
      session.data.nodes
        .filter(node => node._id !== d.id)
        .forEach(node => node.selected = false);
    }
    d.selected = !d.selected;
    $window.trigger('node-selected');
  }

  $('#toggle-map-settings').on('click', function () {
    var pane = $('#map-settings-pane');
    if ($(this).hasClass('active')) {
      pane.animate({ left: '-400px' }, function () { pane.hide(); });
    } else {
      pane.show(0, function () { pane.animate({ left: '0px' }); });
    }
  });

  $('#map-fit').on('click', function () {
    map.flyToBounds(layers.nodes.getBounds());
  });

  $('#map-layer-upload').on('click', function () {
    $('#map-file-input').click();
  });

  $('#map-file-input').on('change', event => {
    Array.from(event.target.files).forEach(file => {
      const { name } = file;
      if (name.endsWith("json")) {
        const layerName = name.split('.').slice(0, -1).join('.').toLowerCase();
        const reader = new FileReader();
        reader.onload = function (event2) {
          temp.mapData[layerName] = JSON.parse(event2.target.result);
          layers[layerName] = L.geoJSON(temp.mapData[layerName], {
            color: '#000',
            weight: .75,
            fillColor: '#fafaf8',
            fillOpacity: .5
          });
          layers[layerName].addTo(map);
          var colorCell = $('<div class="col-3"></div>').append(
            $('<input type="color" class="w-100">').on('change', function (e) {
              layers[layerName].setStyle(f => ({ color: e.target.value }));
            })
          );
          var nameCell = $(`<div class="col-9">${layerName}</div>`).prepend(
            $('<a href="#" class="oi oi-circle-x align-middle p-1" title="Remove this file"></a>').on('click', function () {
              nameCell.remove();
              colorCell.remove();
              layers[layerName].remove();
            })
          );
          $('#map-geojson-layers')
            .append(nameCell)
            .append(colorCell);
        };
        reader.readAsText(file);
      } else {
        alert("Only GeoJSON Files are currently Supported.");
      }
    });
  });

  function resetStack() {
    //Tile Layers, in reverse order:
    if (layers.satellite && session.style.widgets['map-satellite-show']) layers.satellite.bringToBack();
    if (layers.basemap && session.style.widgets['map-basemap-show']) layers.basemap.bringToBack();

    //Background Layers, in order:
    if (layers.countries && session.style.widgets['map-countries-show']) layers.countries.bringToFront();
    if (layers.states && session.style.widgets['map-states-show']) layers.states.bringToFront();
    if (layers.counties && session.style.widgets['map-counties-show']) layers.counties.bringToFront();

    //User Layers:
    Object.keys(layers)
      .filter(l => !['countries', 'states', 'counties', 'satellite', 'basemap', 'links', 'nodes'].includes(l))
      .forEach(l => layers[l].bringToFront());

    //Foreground Layers, in order:
    if (layers.links && !layers.links.remove && session.style.widgets['map-link-show']) layers.links.bringToFront();
    if (layers.nodes && !layers.nodes.remove && session.style.widgets['map-node-show']) layers.nodes.bringToFront();

    drawNodes();
  }

  $('#map-node-show').parent().on('click', function () {
    session.style.widgets['map-node-show'] = true;
    drawNodes();
  });
  $('#map-node-hide').parent().on('click', function () {
    session.style.widgets['map-node-show'] = false;
    layers.nodes.remove();
  });

  $('#map-link-show').parent().on('click', function () {
    session.style.widgets['map-link-show'] = true;
    drawLinks();
    if (layers.nodes.bringToFront && session.style.widgets['map-node-show']) layers.nodes.bringToFront();
  });
  $('#map-link-hide').parent().on('click', function () {
    session.style.widgets['map-link-show'] = false;
    layers.links.remove();
  });

  $('#map-countries-show').parent().on('click', function () {
    session.style.widgets['map-countries-show'] = true;
    if (layers.countries) {
      layers.countries.addTo(map);
      resetStack();
    } else {
      getMapData('countries.json', () => $(this).trigger('click'));
    }
  });
  $('#map-countries-hide').parent().on('click', function () {
    session.style.widgets['map-countries-show'] = false;
    layers && layers.countries && layers.countries.remove();
  });

  $('#map-states-show').parent().on('click', function () {
    session.style.widgets['map-states-show'] = true;
    if (layers.states) {
      layers.states.addTo(map);
      resetStack();
    } else {
      getMapData('states.json', () => $(this).trigger('click'));
    }
  });
  $('#map-states-hide').parent().on('click', function () {
    session.style.widgets['map-states-show'] = false;
    layers && layers.states && layers.states.remove();
  });

  $('#map-counties-show').parent().on('click', function () {
    session.style.widgets['map-counties-show'] = true;
    if (layers.counties) {
      layers.counties.addTo(map);
      resetStack();
    } else {
      getMapData('counties.json', () => $(this).trigger('click'));
    }
  });
  $('#map-counties-hide').parent().on('click', function () {
    session.style.widgets['map-counties-show'] = false;
    layers && layers.counties && layers.counties.remove();
    // layers.counties.remove();
  });

  $('#map-basemap-show').parent().on('click', function () {
    session.style.widgets['map-basemap-show'] = true;
    layers.basemap.addTo(map);
    $('#map-satellite-hide').trigger('click');
    $('#map-countries-hide').trigger('click');
    $('#map-states-hide').trigger('click');
    $('#map-counties-hide').trigger('click');
  });
  $('#map-basemap-hide').parent().on('click', function () {
    session.style.widgets['map-basemap-show'] = false;
    layers.basemap.remove();
    $('#map-countries-show').trigger('click');
    $('#map-states-show').trigger('click');
  });

  $('#map-satellite-show').parent().on('click', function () {
    session.style.widgets['map-satellite-show'] = true;
    layers.satellite.addTo(map);
    $('#map-basemap-hide').trigger('click');
    $('#map-countries-hide').trigger('click');
    $('#map-states-hide').trigger('click');
    $('#map-counties-hide').trigger('click');
  });
  $('#map-satellite-hide').parent().on('click', function () {
    session.style.widgets['map-satellite-show'] = false;
    layers.satellite.remove();
    $('#map-countries-show').trigger('click');
    $('#map-states-show').trigger('click');
    resetStack();
  });

  $('#map-collapsing-on').parent().on('click', function () {
    session.style.widgets['map-collapsing-on'] = true;
    drawNodes();
  });
  $('#map-collapsing-off').parent().on('click', function () {
    session.style.widgets['map-collapsing-on'] = false;
    drawNodes();
  });

  $('#map-node-transparency').on('input', function (e) {
    session.style.widgets['map-node-transparency'] = parseFloat(e.target.value);
    drawNodes();
  });

  $('#map-node-tooltip-variable').on('change', function (e) {
    session.style.widgets['map-node-tooltip-variable'] = e.target.value;
  });

  $('#map-link-transparency').on('input', function (e) {
    session.style.widgets['map-link-transparency'] = parseFloat(e.target.value);
    drawLinks();
  });

  $('#map-link-tooltip-variable').on('change', function (e) {
    session.style.widgets['map-link-tooltip-variable'] = e.target.value;
  });

  $('#map-node-jitter').on('input', function (e) {
    var v = parseFloat(e.target.value);
    session.style.widgets['map-node-jitter'] = v;
    jitter();
    drawLinks();
    drawNodes();
  });

  function jitter() {
    var v = session.style.widgets['map-node-jitter'] == -2 ? 0 : Math.pow(2, session.style.widgets['map-node-jitter']);
    var n = nodes.length;
    for (var i = 0; i < n; i++) {
      var node = nodes[i];
      node._jlon = parseFloat(node._lon) + v * node._j * Math.cos(node._theta);
      node._jlat = parseFloat(node._lat) + v * node._j * Math.sin(node._theta);
    }
  }

  $('#map-node-jitter-reroll').on('click', function () {
    rerollNodes();
    drawLinks();
    drawNodes();
  });

  function rerollNodes() {
    nodes.forEach(function (node) {
      node._theta = MT.r01() * Math.PI * 2;
      node._j = MT.r01();
    });
    jitter();
  }

  function makeGeoJSON() {
    var features = [];
    var jitter = session.style.widgets['map-node-jitter'] > 0;
    nodes.forEach(function (d) {
      if (d._lat && d._lon) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: jitter ? [d._lon + d._jlon, d._lat + d._jlat] : [d._lon, d._lat]
          },
          properties: d
        });
      }
    });
    MT.getVisibleLinks().forEach(function (d) {
      if (!d.visible) return;
      var source = nodes.find(node => node._id == d.source);
      var target = nodes.find(node => node._id == d.target);
      if (source && target) {
        if (source._lat && source._lon && target._lat && target._lon) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: jitter ? [
                [source._lon + source._jlon, source._lat + source._jlat],
                [target._lon + target._jlon, target._lat + target._jlat]
              ] : [
                  [source._lon, source._lat],
                  [target._lon, target._lat]
                ]
            },
            properties: d
          });
        }
      }
    });
    return {
      type: 'FeatureCollection',
      features: features
    };
  }

  $('#map-export').on('click', function () {
    var format = $('#map-export-file-format').val();
    if (['png', 'jpeg', 'webp'].includes(format)) {
      document.getElementById('map-collapsing-off').click();
      setTimeout(() => {
        leafletImage(map, function (err, canvas) {
          canvas.toBlob(blob => {
            saveAs(blob, $('#map-export-file-name').val() + '.' + format);
          }, 'image/' + format);
        });
      }, 500); 
    } else if (format == 'geojson') {
      saveAs(
        new Blob([JSON.stringify(makeGeoJSON())], { type: 'application/json;charset=utf-8' }),
        $('#map-export-file-name').val() + '.' + format
      );
    }
  });

  $window
    .on('node-visibility node-selected', function () {
      matchCoordinates(function () {
        rerollNodes();
        drawLinks();
        drawNodes();
      });
    })
    .on('node-color-change', drawNodes)
    .on('link-color-change link-visibility', drawLinks);

  layout.on('stateChanged', function () {
    setTimeout(function () {
      map.invalidateSize();
    }, 80);
  });

  function initialLoadUpdate() {
    if (temp.mapData['map-countries-show'] == false) $('#map-countries-hide').trigger('click');
    if (temp.mapData['map-states-show'] == false) $('#map-states-hide').trigger('click');
    if (temp.mapData['map-counties-show'] == true) $('#map-counties-show').trigger('click');
    if (temp.mapData['map-basemap-show'] == true) $('#map-basemap-show').trigger('click');
    if (temp.mapData['map-satellite-show'] == true) $('#map-satellite-show').trigger('click');
    delete temp.mapData['map-countries-show'];
    delete temp.mapData['map-states-show'];
    delete temp.mapData['map-counties-show'];
    delete temp.mapData['map-basemap-show'];
    delete temp.mapData['map-satellite-show'];  
    map.flyToBounds(layers.nodes.getBounds());
  }

  setTimeout(function () {
    matchCoordinates(function () {
      rerollNodes();
      drawLinks();
      drawNodes();
      initialLoadUpdate();
    });
    
    if (layers.nodes.length) map.flyToBounds(layers.nodes.getBounds());
    
  }, 40);

})();