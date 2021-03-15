(function () {
  ga('set', 'page', '/timeline');
  ga('set', 'title', 'Timeline View');
  ga('send', 'pageview');

  var width,
    height,
    middle,
    svg,
    timeDomainStart,
    timeDomainEnd,
    x,
    y,
    histogram,
    brush,
    brushG,
    selection,
    timer,
    tick = 0,
    isPlaying = false,
    margin = { top: 50, left: 20, right: 20, bottom: 30 };

  function refresh() {
    var wrapper = $("#timeline").empty().parent();
    var tickFormat = d3.timeFormat("%Y-%m-%d");
    width = wrapper.width() - margin.left - margin.right;
    height = wrapper.height() - margin.top - margin.bottom;
    middle = height / 2;

    var field = $("#timeline-date-field").val();
    var times = [],
      vnodes = JSON.parse(JSON.stringify(session.data.nodes));
    vnodes.forEach(d => {
      var time = moment(d[field]);
      if (time.isValid()) {
        d[field] = time.toDate();
        times.push(d[field]);
      } else {
        d[field] = null;
      }
    });
    if (times.length < 2) {
      times = [new Date(2000, 1, 1), new Date()];
    }
    timeDomainStart = Math.min(...times);
    timeDomainEnd = Math.max(...times);

    x = d3
      .scaleTime()
      .domain([timeDomainStart, timeDomainEnd])
      .rangeRound([0, width]);

    y = d3.scaleLinear().range([height, 0]);

    histogram = d3
      .histogram()
      .value(d => d[field])
      .domain(x.domain())
      .thresholds(d3.thresholdScott); 
      // .thresholds(d3.thresholdFreedmanDiaconis);  #205

    svg = d3
      .select("#timeline")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    var epiCurve = svg
      .append("g")
      .classed("timeline-epi-curve", true)
      .attr("transform", "translate(" + margin.left + ",0)");

    var bins = histogram(vnodes);

    if (!session.style.widgets["timeline-noncumulative"]) {
      var sum = 0;
      bins.forEach(bin => {
        sum += bin.length;
        bin.length = sum;
      });
    }

    // Scale the range of the data in the y domain
    y.domain([0, d3.max(bins, d => d.length)]);

    // append the bar rectangles to the svg element
    epiCurve
      .selectAll("rect")
      .data(bins)
      .enter()
      .append("rect")
      .attr("transform", d => `translate(${x(d.x0)},${y(d.length)})`)
      .attr("width", d => x(d.x1) - x(d.x0))
      .attr("height", d => height - y(d.length))
      .attr("fill", session.style.widgets["node-color"]);

    svg
      .append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(" + margin.left + "," + height + ")")
      .call(
        d3
          .axisBottom(x)
          .tickSize(8)
          .tickPadding(8)
          .tickFormat(tickFormat)
      )
      .attr("text-anchor", null)
      .selectAll("text")
      .attr("x", 6);

    brush = d3
      .brushX()
      .extent([[0, 0], [width, height]])
      .on("start brush", function () {
        selection = d3.brushSelection(brushG.node());
        if (!selection) return;
        if (selection[0] > 0) {
          selection[0] = 0;
          brushG.call(brush.move, selection);
        }
      })
      .on("end", function () {
        selection = d3.brushSelection(brushG.node());
        if (!selection) return;
        if (selection[0] > 0) {
          selection[0] = 0;
          brushG.call(brush.move, selection);
          propagate();
        }
      });

    brushG = svg
      .append("g")
      .attr("class", "brush")
      .attr("transform", "translate(" + margin.left + ",0)")
      .call(brush);
  }

  $("#timeline-play").click(function () {
    var $this = $(this);
    if (isPlaying) {
      $this.html('<span class="oi oi-media-play"></span>');
      timer.stop();
      isPlaying = false;
    } else {
      $this.html('<span class="oi oi-media-pause"></span>');
      isPlaying = true;
      setTimer();
    }
  });

  function setTimer() {
    if (timer) {
      timer.stop();
      d3.timerFlush();
    }
    timer = d3.interval(function () {
      var selection = d3.brushSelection(brushG.node());
      if (!selection) return timer.stop(); // Ignore empty selections
      if (selection[1] >= width) {
        $("#timeline-play").click();
        return;
      }
      brushG.call(brush.move, selection.map(s => s + 1));
      if(++tick % 5 == 0) propagate();
    }, 110 - parseInt($("#timeline-speed").val()));
    if (!isPlaying) timer.stop();
  }

  function propagate(){
    session.state.timeStart = x.invert(selection[0]);
    session.state.timeEnd = x.invert(selection[1]);
    MT.setNodeVisibility(true);
    MT.setLinkVisibility(true);
    MT.tagClusters().then(() => {
      ["node", "link"].forEach(function (thing) {
        $window.trigger(thing + "-visibility");
      });
    });
  }

  $("#timeline-toggle-settings")
    .click(function () {
      var pane = $("#timeline-settings-pane");
      if ($(this).hasClass('active')) {
        pane.animate({ left: "-400px" }, function () {
          pane.hide();
        });
      } else {
        pane.show(0, function () {
          pane.animate({ left: "0px" });
        });
      }
    })
    .trigger("click");

  $("#timeline-date-field").on("change", function () {
    session.style.widgets["timeline-date-field"] = this.value;
    refresh();
  });

  $('[name="timeline-cumulation"]').on("change", function () {
    session.style.widgets["timeline-noncumulative"] =
      $("#timeline-noncumulative").is(":checked");
    refresh();
  });

  $window.on("node-color-change", function () {
    svg
      .select(".timeline-epi-curve")
      .selectAll("rect")
      .attr("fill", session.style.widgets["node-color"]);
  });

  $("#timeline-speed").on("change", setTimer);

  layout.on("stateChanged", refresh);
})();