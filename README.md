Simple-Rates-Graph
==================

A small library for displaying OANDA's rate history data in a candlestick chart with a line chart control that allows filtering the candlesticks.

##Setup

###JavaScript Dependencies
Before including the `OCandlestickChart` file, both oandajs and Google's JavaScript API have to be loaded.

```HTML
<script src="https://rawgithub.com/mrpoulin/oandajs/update/oanda.js"></script>
<script src="https://www.google.com/jsapi"></script>
```

Then you can include the library file:

```HTML
<script src="./OCandlestickChart.js"></script>
```

###Initialization
Google requires that it's API be initialized before using any functions. You must load the corechart and the controls package, along with any other modules your application uses:

```HTML
<script>
    google.load("visualization", "1.1", {packages:["corechart, controls"]});
</script>
```

**Note:** The unstable version (1.1) of both modules is required to stop candlesticks from being cut off at the edges of the graph.

You can also configure oandajs to add a auth token or change the API endpoint URL:

```HTML
<script>
    OANDA.baseURL = "http://api-sandbox.oanda.com"
</script>
```

###HTML Structure
The candlestick chart requires two DOM elements: one for the candlestick chart and one for the line chart that must both we wrapped in the same parent container.
A typical setup may look like this:

```HTML
<div id="parent">
    <div id="chart">
        <!-- Candlestick chart will be displayed here -->
    </div>
    <div id="control">
        <!-- Line chart control will be dispalyed here -->
    </div>
</div>
```
The parent div holds the 'dashboard', which holds the candlestick chart and the control chart. Feel free to be as creative as you want with the placements, as the two charts will work together as long as they are part of the same parent element.

##Use

###Creating a Chart

After your HTML is set up, you can initialize an OCandleStickChart instance. The constructor is as follows:

```JavaScript
function OCandlestickChart(dashElement, chartElement, controlElement, candleOpts, dimensionOpts)
```

The first 3 arguments are DOM objects where the dashboard, chart and chart control will be rendered, respectively. The candleOpts argument allows you to configure the candlesticks that will be displayed. Finally, the dimensionOpts arguments lets you control the width & height of both the chart and control elements. The format of the candleOpts and dimensionOpts arguments will follow. If not specified, default values will be assumed:

####candleOpts
|Property   |Type    |Default                  |
|-----------|--------|-------------------------|
|granularity|String  |M30                      |
|instrument |String  |EUR_USD                  |
|startTime  |Date    |(Current day at midnight)|
|endTime    |Date    |(Current time)           |


####dimensionOpts
|Property|Type|Default|
|--------|----|-------|
|chart.height|Mixed|80%|
|chart.width|Mixed|80%|
|control.width|Mixed|80%|
|control.height|Mixed|null|

**Note:** dimension can be entered as percentiles (strings) or as pixels (numbers).

###Rendering a Chart
Once your chart is initialized, you will want to set the chart's render method as Google's `onLoadCallback`. The proper way of doing is:

```JavaScript
var chart = OCandleStickChart(/*...*/);
google.setOnLoadCallback( function() { chart.render(); } );
```
You can call the render method any time to re-render the chart if necessary.

###Changing Chart Data
Currently, the OCandlestickChart class allows you to change the granularity, start time, and instrument of an already created chart. Doing so will cause the chart to re-render with new data.

|Method Name|Effect|
|-----------|------|
|setGranularity|Changes the granularity of candle's for given instrument from given start and end times.|
|setStartTime|Gets candles from the given start time|
|setEndTime|Gets candles to the given end time|
|setInstrument|Get candles for the given instrument|

**Note:** No error checking is done on any of the values passed to these functions.

##Utility Functions

Utility functions can be accessed through `OCandlestickChart.util`.

|Method Name|Description|
|-----------|-----------|
|`getDaysInMonth(year, month)`|Takes a year and zero indexed month and returns the number of days in that month for the given year.|

###Enabling Streaming
To have the chart update automatically with the latest candlesticks, the `streamingEnabled` flag can be set to true.

##Known Issues
* Candlesticks are cut off at the edges of the graph.
FIX: Load version 1.1 (unstable) of the visualization library.

* Dragging sliders too close together sometimes causes the x-axis to change to a 10 year scale.

##License
The MIT License (MIT)

Copyright (c) 2013 OANDA Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
