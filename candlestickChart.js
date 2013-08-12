//OCandlestickChart. The O prefix is to avoid a naming conflict with google's CandleStickChart.
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

        var options = { 'title' : "Candlesticks", height : 600 };
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
    console.log(params.day);
    console.log(this.startTime);
    this.chart.clearChart();
    this.render();
};

OCandlestickChart.util = {};

OCandlestickChart.util.getDaysInMonth = function(year, month) {
    var start = new Date(year, month, 1);
    var end = new Date(year, parseInt(month, 10) + 1, 1);
    return (end - start)/(1000 * 60 * 60 * 24);
};

//List of possible granularity values.
OCandlestickChart.util.granularities = 
    ['S5', 'S10', 'S15', 'S30', 'M1', 'M2', 'M3', 'M5', 'M10',
     'M15', 'M30', 'H1', 'H2', 'H3', 'H4', 'H6', 'H8', 'H12',
     'D', 'W', 'M'];
