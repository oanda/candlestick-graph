// OCandlestickChart
// Renders midpoint based candlesticks as a candlestick chart.
// OANDA, 2013

/* Constructor: Creates a new chart, sets up default chart and chart display options, creates and binds chart to control.
 * Arguments:
 * dashElement    : DOM object
 * chatElement    : DOM object
 * controlElement : DOM object
 * errorElement   : DOM object
 * candleOpts     : Object
 * dimensionOpts  : Object
 *
 * Refer to README.md for more detailed argument information.
 */
function OCandlestickChart(dashElement, chartElement, controlElement, errorElement, candleOpts, dimensionOpts) {

    //Store reference to parent container for error display:
    this.parentContainer = errorElement;

    dimensionOpts = dimensionOpts || { chart : {}, control : {} };

    //Set up default chart options (granularity, start time, end time, instrument, etc).
    candleOpts = candleOpts || {};

    //Default start time set to beginning of current day.
    var todayAtMidnight = new Date();
    todayAtMidnight.setHours(0,0,0);
    this.startTime = candleOpts.startTime || todayAtMidnight;

    this.granularity = candleOpts.granularity || 'M30';
    this.instrument = candleOpts.instrument || 'EUR_USD';

    //Default end time set to current time.
    this.endTime = candleOpts.endTime || new Date();

    //Streaming related variables. Streaming off by default.
    this.streamingEnabled = candleOpts.streamingEnabled || false;
    this.callbacks = { 'timeout' : 0, 'interval' : 0};

    //Create dashboard which will control candlestick chart and control.
    this.dash = new google.visualization.Dashboard(dashElement);

    //Immutable chart options:
    this.chartOpts = {
        'chartArea' :  {'width' : dimensionOpts.chart.width || '80%', 'height' : dimensionOpts.chart.height || '80%' },
        'hAxis' : { 'slantedText' : false },
    };    
    this.chart = new google.visualization.ChartWrapper({
        'chartType' : 'CandlestickChart',
        'containerId' : chartElement,
    });

    //Immutable control options:
    this.controlOpts = {
        'filterColumnIndex': 0,
        'ui': {
            'chartType': 'LineChart',
            'chartOptions': {
                'chartArea': {'width': dimensionOpts.control.width || '80%', 'height' : dimensionOpts.control.height},
                'hAxis': {'baselineColor': 'none'}
            },
            'chartView': {
                'columns': [0, 3]
            },
        }
    };
    this.control = new google.visualization.ControlWrapper({
        'controlType' : 'ChartRangeFilter',
        'containerId' : controlElement,
    });

    //Allow the control element to manipulate the chart.
    this.dash.bind(this.control, this.chart);

    //Set up the granularity table as 'private' variable:
    var grans = { 
        'S5'  : 5, 
        'S10' : 10, 
        'S15' : 15, 
        'S30' : 30, 
        'M1'  : 60, 
        'M2'  : 120, 
        'M3'  : 180,
        'M5'  : 300, 
        'M10' : 600,
        'M15' : 900, 
        'M30' : 1800, 
        'H1'  : 3600, 
        'H2'  : 7200, 
        'H3'  : 10800, 
        'H4'  : 14400, 
        'H6'  : 21600, 
        'H8'  : 28800,
        'H12' : 43200,
        'D'   : 86400, 
        'W'   : 604800,
        'M'   : -1,
    };

    //The 'this' qualified methods are accessible to class instances.
    //Month granulairy in seconds will be based on the given year/month.
    this.granularityMap = function(year, month) {
        var daysInMonth = OCandlestickChart.util.getDaysInMonth(year, month);
        grans['M'] = daysInMonth * 24 * 60 * 60;
        return grans;
    };
    
    //Expose list of all possible granulairy values.
    this.granularities = Object.keys(grans);
}

/* render: Queries the OANDA API for candlesticks in the set time range with the set granulairty, and updates the chart with the data.
 *         If streaming is enabled, a polling loop will be started to fetch and update the chart with new candles.
 */
OCandlestickChart.prototype.render = function() {

    //Month granularity in seconds will be based off start time, which may cause synchronization issues while streaming
    //monthly candlesticks. It is unlikely that you will stream monthly candlesticks.
    var granSecs = this.granularityMap(this.startTime.getFullYear(), this.startTime.getMonth())[this.granularity] * 1000;

    //Create instance of data table with the proper columns.
    var data = new google.visualization.DataTable();
    data.addColumn('datetime', 'Time');
    data.addColumn('number', 'Low');
    data.addColumn('number', 'Close');
    data.addColumn('number', 'Open');
    data.addColumn('number', 'High');

    //Preserve self-reference.
    var self = this;
    
    /* Queries the API for a fixed amount of candles, calls the onComplete method with the completed data set.
     */
    function queryFixed(onComplete) {

        //Since candles can only be returned in groups of 5000 and users may request time intervals where more than
        //5000 candles can exist, we must break the time interval into 5000 candles chunks.
        var intervals = [self.startTime];
        var dateIter = self.startTime;
        while((self.endTime - dateIter) >= (granSecs * 5000)) {
            dateIter = new Date(dateIter.getTime() + granSecs * 5000);
            intervals.push(dateIter);
        }
        //Add 1 second since API only returns candles past and not on the given end time.
        intervals.push(new Date(self.endTime.getTime() + 1000));
       
        //Recursive function that gets candles between all necessary intervals.
        function getData(i) {
            if(i+1 < intervals.length) {
                OANDA.rate.history(self.instrument, { 'start' : intervals[i].toISOString(),
                                                      'end'   : intervals[i+1].toISOString(),
                                                      'candleFormat' : 'midpoint', 'granularity' : self.granularity }, function(response) {
                    if(response.error) {
                        console.log(response.error);
                        return;
                    }

                    for(var j = 0 ; j < response.candles.length; j++) {
                        var candle = response.candles[j];
                        data.addRow([new Date(candle.time), candle.lowMid, candle.closeMid, candle.openMid, candle.highMid]);
                    }
                    getData(i+1);
                });
            } else {
                onComplete(data);
                return;
            }
        }
        getData(0);
    }

    /*
     * Create and draw a data table with candles starting from the given start time, up to the current time, adding
     * new candles as they become available. Automatically re-draws the graph as candles are provided.
     */
    function queryLoop(data) {

        function now() {
            return new Date();
        }

        //Do one render to push out any candles that are sitting in the table (i.e. the user turns on streaming
        //after leaving chart open for a while).
        draw(data, false);

        //start time will be set to the last candle, end time will be set to the next possible candle.
        var interval = { 'start' : new Date(data.getValue(data.getNumberOfRows() - 1, 0))};
        interval.end = new Date(interval.start.getTime() + granSecs + 1000);

        //Multiplies granularity added to end time to progress over intervals where no candles are returned.
        var granMultiplier = 0;

        //Polls the API for new candlesticks, setting the start and end times based on last displayed candle in chart.
        var poll = function() {
            console.log("Polled at: " + now());
            OANDA.rate.history(self.instrument, {'start' : interval.start.toISOString(), 'end' : interval.end.toISOString(),
                'candleFormat' : 'midpoint', 'granularity' : self.granularity, 'includeFirst' : true}, 
                function(response) {

                    for(var j = 0 ; j < response.candles.length; j++) {
                        var candle = response.candles[j];
                        //If a candle is returned with a timestamp equal to the last displayed candle, attempt to
                        //update the last displayed candle with new data.
                        if(data.getValue(data.getNumberOfRows() - 1, 0).getTime() === new Date(candle.time).getTime()) {
                            data.setValue(data.getNumberOfRows() - 1, 1, candle.lowMid);
                            data.setValue(data.getNumberOfRows() - 1, 2, candle.closeMid);
                            data.setValue(data.getNumberOfRows() - 1, 3, candle.openMid);
                            data.setValue(data.getNumberOfRows() - 1, 4, candle.highMid);
                            //Draw now to show candle being update with animatione effect.
                            draw(data, true);
                            continue;
                        }
                        //Make sure no already seen candles are added as new rows.
                        //if(interval.start < new Date(candle.time).getTime()) {
                        data.addRow([new Date(candle.time), candle.lowMid, candle.closeMid, candle.openMid, candle.highMid]);
                        granMultiplier = 0;
                        //}
                    }

                    //If no row is added, granMultiplier will be non-zero, and this will be incremented to some value > 1.
                    //If a row is added, granMultiplier will be zero and will be incremented to one (having no effect).
                    granMultiplier++;

                    //Set the start time to be the latest candle displayed.
                    interval.start = data.getValue(data.getNumberOfRows() - 1, 0);
                    //Set the end time to the next time where a candle should be returned.
                    //An offset of 1000 seconds is required since the API only returns candles past a given end time.
                    interval.end = new Date(interval.start.getTime() + granSecs * granMultiplier + 1000);

                    //Only re-render if rows were added
                    if(granMultiplier === 1) {
                        draw(data, false);
                    }
                });
        };

        //Attempt to round up current time to match granularity.
        var nextCandle = Math.ceil(now().getTime() / granSecs) * granSecs;

        //Set a delay before polling interval is started to synchronize each poll with the approximate time
        //the next candle should be ready.
        var startIn = nextCandle - now().getTime() + 1000;
        console.log('It is: ' + now() + ' Starting poll in: ' + startIn / 1000 + ' seconds');
        //Poll 4 times as frequently as the granularity to allow updating partial candles (since candlesticks may change before the next candle is released).
        self.callbacks.timeout = setTimeout( 
                function() { self.callbacks.interval = setInterval(poll, granSecs / 4); poll();}, startIn);
    }

    //If streaming is enabled, first get all candles from the start time to now, then start a polling loop.
    if(this.streamingEnabled) {
        //update endtime to now.
        queryFixed( function(data) { queryLoop(data); });
    } else {
        queryFixed( function(data) { draw(data, false); });
    }

    /*
     * Renders the data to the chart; Animation is optional since it really messes up the
     * sliding action of the chart control.
     */
    function draw(data, animate) {
        //Set up extra chart options.
        self.chartOpts.title = self.instrument + " Candlesticks";
        if(animate) {
            self.chartOpts.animation = { 'duration' : 1000, 'easing' : 'out' };
        }
        self.chartOpts.legend = { 'position' : 'none' };
        //Set up extra control options:
        self.controlOpts.ui.minRangeSize = granSecs * 2;
        //Reset the state of the control so the sliders stay in bounds.
        self.control.setState({ 'start' : data.getColumnRange(0).min, 'end' :  data.getColumnRange(0).max});

        self.chart.setOptions(self.chartOpts);
        self.control.setOptions(self.controlOpts);
        self.dash.draw(data);
    }
};

/* Clears the chart and control with their internal reset methods and cancels and polling.
 */
OCandlestickChart.prototype.reset = function() {

    var controlHandle = this.control.getControl();
    var chartHandle = this.chart.getChart();
    controlHandle.resetControl();
    chartHandle.clearChart();
    
    clearInterval(this.callbacks.interval);
    clearTimeout(this.callbacks.timeout);
};

/* Changes the granularity of the candles displayed on the chart. Will reset the chart.
 */
OCandlestickChart.prototype.setGranularity = function(granularity) {

    if(this.granularities.indexOf(granularity) < 0) {
        this.timedError("Not a valid granularity!");
    } else {
        this.granularity = granularity;
        this.reset();
        this.render();
    }
    return this.granularity;
};

/* Changes the instrument of the candles shown in the chart. Will reset the chart.
 */
OCandlestickChart.prototype.setInstrument = function(instrument) {

    this.instrument = instrument;
    this.reset();
    this.render();
    return this.instrument;
};

/* Changes the start time of the displayed candles. Will reset the chart.
 */
OCandlestickChart.prototype.setStartTime = function(params) {
    
    
    var newStartTime = new Date(params.year    || this.startTime.getFullYear(), 
                                params.month   || this.startTime.getMonth(), 
                                params.day     || this.startTime.getDate(), 
                                params.hours   || this.startTime.getHours(),
                                params.minutes || this.startTime.getMinutes(), 
                                params.seconds || this.startTime.getSeconds());

    if(newStartTime >= this.endTime.getTime()) {
        this.timedError("Start time set to be greater than or equal to end time");
    } else { 
        this.startTime = newStartTime;
        this.reset();
        this.render();
    }
    return this.startTime;
};

/* Changes the end time of the displayed candles. Will reset the chart.
 */
OCandlestickChart.prototype.setEndTime = function(params) {
    
    var newEndTime  = new Date(params.year    || this.endTime.getFullYear(),
                               params.month   || this.endTime.getMonth(),
                               params.day     || this.endTime.getDate(),
                               params.hours   || this.endTime.getHours(), 
                               params.minutes || this.endTime.getMinutes(), 
                               params.seconds || this.endTime.getSeconds());

    if(newEndTime <= this.startTime.getTime()) {
        this.timedError("End time set less than or equal to start time.");
    } else {
        this.endTime = newEndTime;
        this.reset();
        this.render();
    }
    return this.endTime;
};

/* Toggles streaming on & off.
 */
OCandlestickChart.prototype.toggleStreaming = function(streamingEnabled) {

    this.streamingEnabled = streamingEnabled;
    this.endTime = new Date();
    this.reset();
    this.render();
};

/*
 * Displays and error string for the specified amount of time to the DOM object which acts as the error container.
 */
OCandlestickChart.prototype.timedError = function(errorString, timeout) {

    var error = google.visualization.errors.addError(this.parentContainer, errorString, "", 
            {'type' : 'error',
             'style' : 'font-size:1em;'});
    setTimeout(function() {google.visualization.errors.removeError(error);}, timeout || 5000);

};

/* 'Static' utility functions
 */
OCandlestickChart.util = {
    'getDaysInMonth' : function(year, month) {
        var start = new Date(year, month, 1);
        var end = new Date(year, parseInt(month, 10) + 1, 1);
        return (end - start)/(1000 * 60 * 60 * 24);
    },
};
