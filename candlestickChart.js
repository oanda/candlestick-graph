var GranularityTable = (function() {

    var my = {};
    var granMap =  { 'S5'  : 5,  
        'S10' : 10 , 
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
    'M'   : /*Depends on the month & year (for feb only). 0 for now.*/ 0,
    };

    my.granularities = Object.keys(granMap);
    my.granulatityToSeconds = function(gran) {
        if(!granMap[gran]) {
            return -1;
        }

        return granMap[gran];
    };

    return my;

}());


function OCandlestickChart(instrument, granularity, chartElement) {

    this.granularity = granularity;
    this.instrument = instrument;
    this.chart = new google.visualization.CandlestickChart(chartElement);
}

OCandlestickChart.prototype.render = function() {

    var candleTime = new Date("2013-08-09T00:00:00Z");
    
    var self = this;
    OANDA.rate.history(this.instrument, { 'start' : candleTime.toISOString(), candleFormat : 'midpoint', granularity : this.granularity}, function(response) {
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

        var options = { 'title' : "Candlesticks", height : 600 };
        console.log(self);
        self.chart.draw(data, options);
    });
};

OCandlestickChart.prototype.changeGranularity = function(granularity) {

    this.chart.clearChart();
    this.granularity = granularity;
    this.render();
};

OCandlestickChart.prototype.changeInstrument = function(instrument) {

    this.chart.clearChart();
    this.instrument = instrument;
    this.render();
};
