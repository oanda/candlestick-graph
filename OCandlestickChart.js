//OCandlestickChart. The O prefix is to avoid a naming conflict with google's CandlestickChart.
function OCandlestickChart(dashElement, chartElement, controlElement, candleOpts, dimensionOpts) {

    //Set up defaults
    candleOpts = candleOpts || {};
    dimensionOpts = dimensionOpts || { chart : {}, control : {} };

    var todayAtMidnight = new Date();
    todayAtMidnight.setHours(9,38,0);
    //Chart range variables
    this.granularity = candleOpts.granularity || 'M30';
    this.instrument = candleOpts.instrument || 'EUR_USD';
    this.startTime = candleOpts.startTime || todayAtMidnight;
    this.endTime = candleOpts.endTime || new Date();

    this.streamingEnabled = candleOpts.streamingEnabled || false;
    this.callbackId = 0;

    //Chart controls
    this.dash = new google.visualization.Dashboard(dashElement);

    this.chartOpts = {
        'chartArea' :  {'width' : dimensionOpts.chart.width || '80%', 'height' : dimensionOpts.chart.height || '80%' },
        'hAxis' : { 'slantedText' : false },
        'animation' : { 'duarion' : 100, 'easing' : 'in'}
    };    

    this.chart = new google.visualization.ChartWrapper({
        'chartType' : 'CandlestickChart',
        'containerId' : chartElement,
    });

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

    //The 'this' qualified methods are accessible to class instances
    this.granularityMap = function(year, month) {
        var daysInMonth = OCandlestickChart.util.getDaysInMonth(year, month);
        grans['M'] = daysInMonth * 24 * 60 * 60;
        return grans;
    };

    this.granularities = Object.keys(grans);
}

OCandlestickChart.prototype.render = function() {


    var granSecs = this.granularityMap(this.startTime.getFullYear(), this.startTime.getMonth())[this.granularity] * 1000;

    var data = new google.visualization.DataTable();
    data.addColumn('datetime', 'Time');
    data.addColumn('number', 'lowMid');
    data.addColumn('number', 'closeMid');
    data.addColumn('number', 'openMid');
    data.addColumn('number', 'highMid');

    var self = this;
    
    /* Queries the API for a fixed amount of candles, calls the onComplete method with the completed data set.
     */
    function queryFixed(onComplete) {

        //Since candles can only be returned in groups of 5000 and users may request time intervals where more than
        //5000 candles can exist, we must break the time interval into 5000 candles chunks.
        var intervals = [self.startTime];
        var dateIter = self.startTime;
        while((self.endTime - dateIter) > granSecs * 5000) {
            dateIter = new Date(dateIter.getTime() + granSecs * 5000);
            intervals.push(dateIter);
        }
        intervals.push(self.endTime);
       
        //Recursive function to get candles in all intervals.
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
    function queryLoop(data, onComplete) {

        function now() {
            return new Date();
        }

        //start time will be set to the last candle, end time will be set to current time rounded to match granularity.
        var interval = { 'start' : new Date(data.getValue(data.getNumberOfRows() - 1, 0)), 'end' : new Date((Math.round(now().getTime() / granSecs) * granSecs) + 1000) };
        console.log("Last candle: " + interval.start);
        console.log("Next candle: " + interval.end);

        //Get the difference between the time of the last candle and our current time:
        var timeMultiplier = 0;
        var poll = function() {
            console.log("Polled at: " + now());
            OANDA.rate.history(self.instrument, {'start' : interval.start.toISOString(), 'end' : interval.end.toISOString(),
                'candleFormat' : 'midpoint', 'granularity' : self.granularity, 'includeFirst' : true}, 
                function(response) {

                    for(var j = 0 ; j < response.candles.length; j++) {
                        var candle = response.candles[j];
                        //Avoid re-adding partial candles.
                        if(interval.start < new Date(candle.time).getTime()) {
                            data.addRow([new Date(candle.time), candle.lowMid, candle.closeMid, candle.openMid, candle.highMid]);
                            timeMultiplier = 0;
                        }
                    }

                    timeMultiplier++;

                    interval.start = data.getValue(data.getNumberOfRows() - 1, 0);
                    console.log('Setting new start time: ' + interval.start);
                    interval.end = new Date(interval.start.getTime() + granSecs * timeMultiplier + 1000);
                    console.log('Setting new end time: ' + interval.end);
                    onComplete(data);
                });
        };

        self.callbackId = setInterval(poll, granSecs);
    }

    /*
     * If no data table is provided, create one using the above method.
     */
    if(this.streamingEnabled) {
        queryFixed( function(data) { queryLoop(data, draw); });
    } else {
        queryFixed(draw);
    }

    /*
     * Render the data to a chart.
     */
    function draw(data) {
        console.log("Draw started.");
        //Set up extra chart options.
        self.chartOpts.title = self.instrument + " Candlesticks";
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

OCandlestickChart.prototype.reset = function() {

    var controlHandle = this.control.getControl();
    var chartHandle = this.chart.getChart();
    controlHandle.resetControl();
    chartHandle.clearChart();
    
    //Stop setInterval from executing.
    clearInterval(this.callbackId);
};

OCandlestickChart.prototype.setGranularity = function(granularity) {

    //TODO: Validation.
    this.granularity = granularity;
    this.reset();
    this.render();
};

OCandlestickChart.prototype.setInstrument = function(instrument) {

    //TODO: Validation?
    this.instrument = instrument;
    this.reset();
    this.render();
};

OCandlestickChart.prototype.setStartTime = function(params) {
    
    //TODO:Validation.
    this.startTime = new Date(params.year    || this.startTime.getFullYear(), 
                              params.month   || this.startTime.getMonth(), 
                              params.day     || this.startTime.getDate(), 
                              params.hours   || 0,
                              params.minutes || 0, 
                              params.seconds || 0);
    this.reset();
    this.render();
};

OCandlestickChart.prototype.setEndTime = function(params) {

    this.endTime = new Date(params.year    || this.endTime.getFullYear(),
                             params.month   || this.endTime.getMonth(),
                             params.day     || this.endTime.getDate(),
                             params.hours   || 0, 
                             params.minutes || 0, 
                             params.seconds || 0);
    this.reset();
    this.render();
};

OCandlestickChart.prototype.toggleStreaming = function(streamingEnabled) {

    this.streamingEnabled = streamingEnabled;
    this.reset();
    this.render();
};

OCandlestickChart.util = {
    'getDaysInMonth' : function(year, month) {
        var start = new Date(year, month, 1);
        var end = new Date(year, parseInt(month, 10) + 1, 1);
        return (end - start)/(1000 * 60 * 60 * 24);
    },
};
