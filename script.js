
var mappiness = {};

mappiness.dataManager = function module() {
  var exports = {},
      dispatch = d3.dispatch('dataReady', 'dataLoading'),
      data,
      constraints_descriptions = {
        in_out: {in: 'Indoors',
                  out: 'Outdoors',
                  vehicle: 'In a vehicle'},
        home_work: {home: 'At home',
                    work: 'At work',
                    other: 'Elsewhere'},
        people: {with_partner: "Spouse, partner, girl/boyfriend",
                with_children: "Children",
                with_relatives: "Other family members",
                with_peers: "Colleagues, classmates",
                with_clients: "Clients, customers",
                with_friends: "Friends",
                with_others: "Other people you know"},
        activities: {do_work: "Working, studying",
                    do_meet: "In a meeting, seminar, class",
                    do_travel: "Travelling, commuting",
                    do_cook: "Cooking, preparing food",
                    do_chores: "Housework, chores, DIY",
                    do_admin: "Admin, finances, organising",
                    do_shop: "Shopping, errands",
                    do_wait: "Waiting, queueing",
                    do_child: "Childcare, playing with children",
                    do_pet: "Pet care, playing with pets",
                    do_care: "Care or help for adults",
                    do_rest: "Sleeping, resting, relaxing",
                    do_sick: "Sick in bed",
                    do_pray: "Meditating, religious activities",
                    do_wash: "Washing, dressing, grooming",
                    do_love: "Intimacy, making love",
                    do_chat: "Talking, chatting, socialising",
                    do_eat: "Eating, snacking",
                    do_caffeine: "Drinking tea/coffee",
                    do_booze: "Drinking alcohol",
                    do_smoke: "Smoking",
                    do_msg: "Texting, email, social media",
                    do_net: "Browsing the Internet",
                    do_tv: "Watching TV, film",
                    do_music: "Listening to music",
                    do_speech: "Listening to speech/podcast",
                    do_read: "Reading",
                    do_theatre: "Theatre, dance, concert",
                    do_museum: "Exhibition, museum, library",
                    do_match: "Match, sporting event",
                    do_walk: "Walking, hiking",
                    do_sport: "Sports, running, exercise",
                    do_gardening: "Gardening, allotment",
                    do_birdwatch: "Birdwatching, nature watching",
                    do_hunt: "Hunting, fishing",
                    do_compgame: "Computer games, iPhone games",
                    do_game: "Other games, puzzles",
                    do_bet: "Gambling, betting",
                    do_art: "Hobbies, arts, crafts",
                    do_sing: "Singing, performing",
                    do_other: "Something else",
                    do_other2: "Something else"
        }
      };

  exports.loadJSON = function(filepath) {
    var load = d3.json(filepath); 

    load.on('progress', function() { dispatch.dataLoading(d3.event.loaded); });

    load.get(function(error, response) {

      response.forEach(function(d) {
        cleanData(d);
      });

      data = response;

      dispatch.dataReady(response);
    });
  };

  
  /**
   * `constraints` is null, or an object with one or more of these keys:
   * 'feeling': One of 'happy', 'relaxed' or 'awake'.
   * [And/or any of the keys accepted by getFilteredData().]
   */
  exports.getCleanedData = function(constraints) {
    constraints = tidyConstraints(constraints);
    var values = getFilteredData(constraints)

    return {
      id: values[0].id,
      constraints: getInflatedConstraints(constraints),
      values: values
    };
  };


  /**
   * Ensures the submitted constraints are the correct format and have any
   * required fields.
   */
  var tidyConstraints = function(constraints) {
    if (constraints == null) {
      constraints = {};
    }
    // Set default.
    if ( ! 'feeling' in constraints) {
      constraints.feeling = 'happy';
    };

    return constraints;
  };


  /**
   * Returns an object containing the textual descriptions of all the
   * constraints supplied.
   *
   * If constraints is like:
   * {
   *  feeling: 'happy',
   *  in_out: 'in',
   *  home_work: 'work',
   *  do_work: 1,
   *  do_music: 0,
   *  with_peers: 1,
   *  notes: "Test"
   * }
   *
   * then the returned object will be like:
   * {
   *  feeling: {value: 'happy', description: 'Happy'},
   *  in_out: {value: 'in', description: 'Indoors'},
   *  home_work: {value: 'work', description: 'At work'},
   *  people: {
   *            with_peers: {value: 1, description: 'Colleagues, classmates'}
   *  },
   *  activities: {
   *                do_work: {value: 1, description: 'Working, studying'},
   *                do_music: {value: 0, description: 'Listening to music'}
   *              },
   *  notes: {value: 'Test', description: 'Test'}
   * }
   */
  var getInflatedConstraints = function(constraints) {
    // What we'll be returning.
    var new_constraints = {};

    if ('feeling' in constraints) {
      // Capitalize first letter. Thanks JavaScript.
      new_constraints.feeling = {
                      value: constraints.feeling,
                      description: constraints.feeling.charAt(0).toUpperCase()
                                      + constraints.feeling.slice(1)};
    };

    if ('in_out' in constraints) {
      new_constraints.in_out = {
            value: constraints.in_out,
            description: constraints_descriptions.in_out[ constraints.in_out ]};
    };
    if ('home_work' in constraints) {
      new_constraints.home_work = {
            value: constraints.home_work,
            description: constraints_descriptions.home_work[
                                            new_constraints.home_work.value ]};
    };
    
    // Get the descriptions for any People constraints.
    var people = {};
    d3.keys(constraints_descriptions.people).forEach(function(k) {
      if (k in constraints) {
        people[k] = {value: constraints[k],
                     description: constraints_descriptions.people[k]};
      };
    });
    if (d3.keys(people).length > 0) {
      new_constraints.people = people; 
    };
  
    // Get the descriptions for any Activities constraints.
    var activities = {};
    d3.keys(constraints_descriptions.activities).forEach(function(k) {
      if (k in constraints) {
        activities[k] = {value: constraints[k],
                         description: constraints_descriptions.activities[k]};
      };
    });
    if (d3.keys(activities).length > 0) {
      new_constraints.activities = activities;
    };

    // Add notes.
    if ('notes' in constraints) {
      new_constraints.notes = {value: constraints.notes,
                               description: constraints.notes};
    };

    return new_constraints;
  };


  /**
   * The same as getFeelingData() but omitting any data points that don't
   * match the supplied constraints.
   *
   * `constraints` should at least have a `feeling` attribute, being one of
   * 'happy', 'relaxed' or 'awake'.
   *
   * Additional, optional attributes:
   *
   * 'in_out': A string, one of 'in', 'out' or 'vehicle'.
   *
   * 'home_work': A string one of 'home', 'work' or 'other'.
   *
   * Any of the keys from constraints_descriptions.people, set to either 1 or 0.
   *
   * Any of the keys from constraints_descriptions.activities, set to 1 or 0.
   *
   * 'notes' can be a string which will be RegExp'd against the point's notes
   * field, ignoring case.
   */
  var getFilteredData = function(constraints) {

    var feeling_data = getFeelingData(constraints.feeling);

    if ('in_out' in constraints) {
      feeling_data = feeling_data.filter(function(d) {
        return constraints.in_out.indexOf(d.in_out) >= 0; 
      });
    };

    if ('home_work' in constraints) {
      feeling_data = feeling_data.filter(function(d) {
        return constraints.home_work.indexOf(d.home_work) >= 0; 
      });
    };

    d3.keys(constraints_descriptions.people).forEach(function(people) {
       if (people in constraints) {
          feeling_data = feeling_data.filter(function(d) {
            return d[people] == constraints[people]; 
          });
       };
    });

    d3.keys(constraints_descriptions.activities).forEach(function(activity) {
       if (activity in constraints) {
          feeling_data = feeling_data.filter(function(d) {
            if (activity == 'do_other') {
              // Special case: The data has do_other and do_other2 as possible
              // fields, but in our UI we conflate them into one 'do_other'
              // field.
              return d[activity] == constraints[activity] || d['do_other2'] == constraints[activity]; 
            } else {
              return d[activity] == constraints[activity]; 
            };
          });
       };
    });

    if ('notes' in constraints) {
      feeling_data = feeling_data.filter(function(d) {
        if (d.notes == null) {
          return false;
        } else {
          return d.notes.match(new RegExp(constraints.notes, 'i')) !== null;
        };
      });
    };

    return feeling_data;
  };


  /**
   * Returns a copy of data but with each object having these additional
   * atributes:
   *  `feeling` - whatever is passed in to this function.
   *  `value` - the numeric value for that feeling.
   *
   * eg, if a data element is like:
   *  {accuracy_m: 200, awake: 0.417671, ...}
   * and we pass 'awake' into getFeelingData, each data element in the returned
   * array will be more like:
   *  {accuracy_m: 200, awake: 0.417671, feeling: 'awake', value: 0.417671, ...}
   *  
   * `feeling` must be one of 'happy', 'relaxed' or 'awake'.
   */
  var getFeelingData = function(feeling) {
    var feeling_data = [];

    // Give this line a unique-enough ID.
    var id = 'id' + Date.now();

    data.forEach(function(d, n) {
      // Don't like having to use jQuery here, but seems simplest/best way
      // to clone an object?
      feeling_data[n] = $.extend({}, d);
      feeling_data[n]['feeling'] = feeling;
      feeling_data[n]['value'] = d[feeling]; 
      feeling_data[n]['id'] = id;
    });

    return feeling_data; 
  };


  // Do any tidying up of the data we need.
  var cleanData = function(d) {
    // Change the string date/times into Date objects.
    d.beep_time = new Date(d.beep_time);
    d.start_time = new Date(d.start_time);
    return d;
  };

  d3.rebind(exports, dispatch, 'on');

  return exports;
};


/**
 * The top, main chart is referred to by `focus`.
 * The bottom, brush chart is referred to by `context`.
 */
mappiness.chart = function module() {
  var // Total width and height for both charts:
      width = 960,
      height = 350,
      margin = {top: 10, right: 10, bottom: 20, left: 30},

      focusMargin,
      focusWidth,
      focusHeight,
      contextMargin,
      contextWidth,
      contextHeight,

      // Elements that will be declared later:
      svg,
      focusG,
      focusAxesG,
      contextG,
      contextAxesG,
      brush,

      xValue = function(d) { return d[0]; },
      yValue = function(d) { return d[1]; },

      focusXScale = d3.time.scale(),
      contextXScale = d3.time.scale(),
      focusYScale = d3.scale.linear(),
      contextYScale = d3.scale.linear(),

      dateFormat = d3.time.format('%-d %b %Y'),
      ratingFormat = function(d) { return d * 100; },
      focusXAxis = d3.svg.axis()
                        .scale(focusXScale)
                        .orient('bottom'),
                        //.tickFormat(dateFormat),
                        //.ticks(d3.time.years, 5),
      contextXAxis = d3.svg.axis()
                        .scale(contextXScale)
                        .orient('bottom'),
      focusYAxis = d3.svg.axis()
                          .scale(focusYScale)
                          .orient('left')
                          .tickFormat(ratingFormat),
      contextYAxis = d3.svg.axis()
                          .scale(contextYScale)
                          .orient('left'),
      
      contextLine = d3.svg.line().x(X).y(contextY),
      focusLine = d3.svg.line().x(X).y(focusY),
      
      colorScale = d3.scale.ordinal()
                      .range(['#dc3a2d', '#2e5aa9', '#518d48', '#000', '#666']);

  function exports(_selection) {
    _selection.each(function(data) {

      // Select svg element if it exists.
      svg = d3.select(this)
                .selectAll('svg')
                  .data([data]);

      // Give each line its own color, keyed by its ID.
      // (The ID is stored in each point of the line.)
      colorScale.domain(data.map(function(d) { return d.values[0].id; } ));

      createMain();

      updateScales(data);

      renderAxes();
    
      renderLines('focus');

      renderBrush();
    });
  };


  function createMain() {
    setDimensions();

    // Create skeletal chart, with no data applied.
    focusG = svg.enter()
                  .append('svg')
                    .append('g')
                      .attr('class', 'focus');

    contextG = svg.append('g')
                      .attr('class', 'context');

    focusAxesG = focusG.append('g')
                      .attr('class', 'axes');

    contextAxesG = contextG.append('g')
                      .attr('class', 'axes');

    // If g.focus already exists, we need to explicitly select it:
    focusG = svg.select('g.focus');
    contextG = svg.select('g.context');

    // Update outer and inner dimensions.
    svg.transition().attr({ width: width, height: height });

    // When we add `clip-path:url(#clip)` to the lines in the main chart,
    // this stops them extending beyond the chart area.
    focusG.append('clipPath')
            .attr('id', 'clip')
            .append('rect')
              .attr('width', focusWidth)
              .attr('height', focusHeight);

    focusG.attr('transform',
                'translate(' + focusMargin.left +','+ focusMargin.top + ')');
    contextG.attr('transform',
              'translate(' + contextMargin.left +','+ contextMargin.top + ')');

  };


  function updateScales(data) {
    setDimensions();

    // Get min and max of all the start times for all the lines.
    focusXScale.domain([
      d3.min(data, function(line) {
        return d3.min(line.values, function(response) {
          return response.start_time;
        })
      }),
      d3.max(data, function(line) {
        return d3.max(line.values, function(response) {
          return response.start_time;
        })
      })
    ]).range([0, focusWidth]);

    contextXScale.domain(focusXScale.domain()).range([0, contextWidth]);

    focusYScale.domain([0, 1]).range([focusHeight, 0]);

    contextYScale.domain(focusYScale.domain()).range([contextHeight, 0]);
  };


  function setDimensions() {
    focusMargin = {top: margin.top, right: margin.right,
                      bottom: 100, left: margin.left};

    // Width and height of main, focus chart area, not including axes.
    focusWidth = width - focusMargin.left - focusMargin.right;
    focusHeight = height - focusMargin.top - focusMargin.bottom;

    contextMargin = {top: focusHeight + 40, right: focusMargin.right,
                      bottom: margin.bottom, left: focusMargin.left};

    // Width and height of small, context chart area, not including axes.
    contextWidth = width - contextMargin.left - contextMargin.right;
    contextHeight = height - contextMargin.top - contextMargin.bottom;
  };


  function renderAxes() {
    renderFocusXAxis();
    renderFocusYAxis();
    renderContextXAxis();
    renderFocusGrid();
  };


  function renderFocusXAxis() {
    focusAxesG.append('g')
            .attr('class', 'x axis');

    focusG.select('.x.axis')
            .attr('transform', 'translate(0,' + focusYScale.range()[0] + ')')
            .call(focusXAxis);
  };


  function renderFocusYAxis() {
    focusAxesG.append('g')
            .attr('class', 'y axis');
    focusG.select('.y.axis')
            .call(focusYAxis);
  };


  function renderContextXAxis() {
    contextAxesG.append('g')
            .attr('class', 'x axis');

    contextG.select('.x.axis')
            .attr('transform', 'translate(0,' + contextYScale.range()[0] + ')')
            .call(contextXAxis);
  };

  /**
   * Adds a horizontal line half way up the chart.
   */
  function renderFocusGrid() {
    focusAxesG.selectAll('path.line.grid')
                .data([[
                        [focusXScale.domain()[0], 0.5],
                        [focusXScale.domain()[1], 0.5]
                      ]])
                .enter().append('path')
                  .attr('class', 'line grid')
                  .attr('d', d3.svg.line()
                                    .x(function(d){return focusXScale(d[0]); })
                                    .y(function(d){return focusYScale(d[1]); })
                                  );
  };

  /**
   * Draw each of the three lines, on either of the charts.
   * `chart` is either 'focus' or 'context'.
   */
  function renderLines(chart) {

    // Each chart has its own element that we draw in, and its own line object.
    if (chart == 'context') {
      var chartEl = contextG;
      var chartLine = contextLine;
    } else {
      var chartEl = focusG;
      var chartLine = focusLine;
    };

    chartEl.selectAll('path.line.feeling')
        .data(function(d) { return d; }, function(d) { return d.values[0].id; })
        .enter().append('path')
          .attr('class', 'line feeling')
          .attr('id', function(d) { return d.values[0].id; })
          .style('stroke', function(d) { return colorScale(d.values[0].id); });

    chartEl.selectAll('path.line.feeling')
        .data(function(d) { return d; })
        .transition()
        .attr('d', function(d) { return chartLine(d.values); });
  };


  /**
   * Hide a line on the chart.
   * `line_type` is one of 'happy', 'awake' or 'relaxed'.
   */
  //function hideLine(line_type) {
    //var newLines = [];
    //currentLines.forEach(function(lt) {
      //if (lt != line_type) {
        //newLines.push(lt);
      //};
    //});
    //currentLines = newLines;

    //d3.selectAll('path.line.'+line_type).style('visibility', 'hidden');
  //};


  /**
   * Hide a line on the chart.
   * `line_type` is one of 'happy', 'awake' or 'relaxed'.
   */
  //function displayLine(line_type) {
    //if ($.inArray(line_type, currentLines) == -1) {
      //currentLines.push(line_type);
    //}; 

    //d3.selectAll('path.line.'+line_type).style('visibility', 'visible');
  //};


  /**
   * Most of the stuff for drawing the context/brush chart.
   */
  function renderBrush() {
    brush = d3.svg.brush()
                        .x(contextXScale)
                        .on('brush', brushed);
                        
    renderLines('context');

    contextG.append('g')
      .attr('class', 'x brush')
      .call(brush)
    .selectAll('rect')
      .attr('y', -6)
      .attr('height', contextHeight + 6);
  };

  function brushed() {
    focusXScale.domain(brush.empty() ? contextXScale.domain() : brush.extent());
    focusG.selectAll('path.line.feeling')
              .attr('d', function(d) { return focusLine(d.values); });
    focusG.select(".x.axis").call(focusXAxis);
  };


  function X(d) {
    return focusXScale(d.start_time);
  };

  function focusY(d) {
    return focusYScale(d.value);
  };
  function contextY(d) {
    return contextYScale(d.value);
  };

  //exports.toggleLine = function(line_type) {
    //if ($.inArray(line_type, currentLines) >= 0) {
      //hideLine(line_type);

    //} else if ($.inArray(line_type, allLines) >= 0
              //&& $.inArray(line_type, currentLines) == -1) {
      //displayLine(line_type);
    //};
  //};

  exports.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return this;
  };

  exports.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return this;
  };

  exports.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return this;
  };

  exports.x = function(_) {
    if (!arguments.length) return xValue;
    xValue = _;
    return chart;
  };

  exports.y = function(_) {
    if (!arguments.length) return yValue;
    yValue = _;
    return chart;
  };

  exports.getColorScale = function() {
    return colorScale; 
  };

  //d3.rebind(exports, dispatch, "on");

  return exports;

};


/**
 * For handling all the dynamic forms etc.
 */
mappiness.ui = function module() {
  var exports = {},
      // Will be a d3 scale once set by setColorScale().
      colorScale;

  exports.init = function() {
  };

  //d3.rebind(exports, dispatch, "on");

  exports.list_lines = function(lines) {
    lines.forEach(function(line) {
      if ($('#key #key-'+line.id).length == 0) {
        // This line isn't listed, so make its empty HTML.
        $('#key').append(
          $('<div/>').attr('id', 'key-'+line.id)
                     .addClass('key-line')
                     .html('<h2></h2><ul class="descriptions"></ul>')
        );
      };

      var cssid = '#key-'+line.id;
      var cons = line.constraints;

      $(cssid).css('border-top-color', colorScale(line.id));

      $('h2', cssid).text(cons.feeling.description);

      if ('in_out' in cons && cons.in_out) {
        $('.descriptions', cssid).append(
          $('<li/>').addClass('in-out').text(cons.in_out.description)
        );
      };
      if ('home_work' in cons && cons.home_work) {
        $('.descriptions', cssid).append(
          $('<li/>').addClass('home-work').text(cons.home_work.description)
        );
      };

      if (d3.keys(cons.people).length > 0) {
        var $ul = $('<ul/>');
        for (c in cons.people) {
          $ul.append(
            $('<li/>').html('<span>' + cons.people[c].value + '</span>'
                          + '<span>' + cons.people[c].description + '</span>')
          );
        };
        $('.descriptions', cssid).append(
          $('<li/>').addClass('people').append($ul)
        );
      };
    
      if (d3.keys(cons.activities).length > 0) {
        var $ul = $('<ul/>');
        for (c in cons.activities) {
          $ul.append(
            $('<li/>').html('<span>' + cons.activities[c].value + '</span>'
                        + '<span>' + cons.activities[c].description + '</span>')
          );
        };
        $('.descriptions', cssid).append(
          $('<li/>').addClass('activities').append($ul)
        );
      };

      if ('notes' in cons && cons.notes) {
        $('.descriptions', cssid).append(
          $('<li/>').addClass('notes').text('Notes: "'+cons.notes.description
                                                                          +'"')
        ); 
      };
    });
  
  };

  exports.setColorScale = function(scale) {
    colorScale = scale;
  };

  return exports;
};


/**
 * The main place where we start things and draw the chart from etc.
 * Call mappiness.controller().init(); to have everything happen.
 */
mappiness.controller = function module() {
  var exports = {},
      data,
      chart,
      // Each element will correspond to one line on the chart, containing
      // all its data.
      lines_data = [],
      dataManager = mappiness.dataManager(),
      ui = mappiness.ui();

  /**
   * Call this to kick things off.
   */
  exports.init = function() {
    
    ui.init();

    dataManager.loadJSON('mappiness.json');

    dataManager.on('dataReady', function() {
      draw_chart(); 
    });
  };

  exports.getLinesData = function(n) {
    if (n == null) {
      return lines_data; 
    } else {
      return lines_data[n];
    };
  };


  function draw_chart() {
    $('#wait').hide();
    $('#loaded').fadeIn(500);

    lines_data.push(dataManager.getCleanedData({feeling: 'happy', in_out: 'in', do_admin: 1, do_music: 0}));
    lines_data.push(dataManager.getCleanedData({feeling: 'awake', with_peers: 1}));
    lines_data.push(dataManager.getCleanedData({feeling: 'relaxed', notes: 'Pepys'}));

    chart = mappiness.chart().width( $('#chart').width() );

    var container = d3.select('#chart')
                      .data([lines_data])
                      .call(chart);

    ui.setColorScale(chart.getColorScale());
    ui.list_lines(lines_data);
  };

  //function prepare_form() {
    //$('.check-line').change(function() {
      //chart.toggleLine($(this).val());
    //});
  //};


  return exports;
};


var controller = mappiness.controller();

controller.init();


