//OCandlestickChart. The O prefix is to avoid a naming conflict with google's CandlestickChart.
function OCandlestickChart(instrument, granularity, startTime, chartElement) {

    this.granularity = granularity;
    this.instrument = instrument;
    //Force graph to start at midnight for now.
    startTime.setHours(0,0,0);
    this.startTime = startTime;
    this.chart = new google.visualization.CandlestickChart(chartElement);
}

OCandlestickChart.prototype.render = function() {

    var self = this;
    OANDA.rate.history(this.instrument, { 'start' : this.startTime.toISOString(), candleFormat : 'midpoint', granularity : this.granularity }, function(response) {
        if(response.error) {
            console.log(response.error);
            return;
        }

        var data = new google.visualization.DataTable();
        data.addColumn('datetime', 'Time');
        data.addColumn('number', 'lowMid');
        data.addColumn('number', 'closeMid');
        data.addColumn('number', 'openMid');
        data.addColumn('number', 'highMid');

        for(var i = 0 ; i < response.candles.length; i++) {
            var candle = response.candles[i];
            data.addRows([[new Date(candle.time), candle.lowMid, candle.closeMid, candle.openMid, candle.highMid]]);
        }

        
        //Adjust columns to stop candlesticks from being cut off:
        var maxX = data.getColumnRange(0).max;
        var minX = data.getColumnRange(0).min;
        var granSeconds = OCandlestickChart.util.granularityMap[self.granularity];

        var options = { 'title'  : self.instrument + " Candlesticks", 
                        'height' : 700,
                        'legend' : { 'position' : 'none' },
                        'hAxis'  : { 'viewWindowMode' : 'explicit',  
                                     'viewWindow' : 
                                        { 'max' : new Date(new Date(maxX).getTime() + granSeconds * 1000),
                                          'min' : new Date(new Date(minX).getTime() - granSeconds * 1000) 
                                        } 
                                   }
        };
        self.chart.draw(data, options);
    });
};

OCandlestickChart.prototype.setGranularity = function(granularity) {

    //TODO: Validation.
    this.granularity = granularity;
    this.chart.clearChart();
    this.render();
};

OCandlestickChart.prototype.setInstrument = function(instrument) {

    //TODO: Validation?
    this.instrument = instrument;
    this.chart.clearChart();
    this.render();
};

OCandlestickChart.prototype.setStartTime = function(params) {
    
    //TODO:Validation.
    this.startTime = new Date(params.year  || this.startTime.getFullYear(), 
                              params.month || this.startTime.getMonth(), 
                              params.day   || this.startTime.getDate(), 
                              0, 0, 0);
    this.chart.clearChart();
    this.render();
};

OCandlestickChart.util = {};

OCandlestickChart.util.getDaysInMonth = function(year, month) {
    var start = new Date(year, month, 1);
    var end = new Date(year, parseInt(month, 10) + 1, 1);
    return (end - start)/(1000 * 60 * 60 * 24);
};

//Maps granularity values to seconds.
OCandlestickChart.util.granularityMap = 
{ 'S5'  : 5, 
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
  'M'   : -1 /*Let user calculate for now.*/
}

//List of possible granularity values.
OCandlestickChart.util.granularities = Object.keys(OCandlestickChart.util.granularityMap);
