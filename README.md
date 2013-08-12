Simple-Rates-Graph
==================

A small library for displaying OANDA's candlestick data in a candlestick chart.

##Use

###Dependencies
Before including the `candlestickChart.js` file, both oandajs and Google's JavaScript API have to be loaded.

```HTML
<script src="https://rawgithub.com/mrpoulin/oandajs/update/oanda.js"></script>
<script src="https://www.google.com/jsapi"></script>
```

Then you can include the library file:

```HTML
<script src="./candlestickChart.js"></script>
```

###Initialization
Google requires that it's API be initialized before using any functions. You must load the corechart package, along with any other modules your application uses:

```HTML
<script>
    google.load("visualization", "1", {packages:["corechart"]});
</script>
```

After the Google API has been loaded, a new instance of an OCandlestickChart can be created:

```HTML
<script>
    google.load("visualization", "1", {packages:["corechart"]});
    var chart = new OCandlestickChart('EUR_USD', 'M30', new Date(), document.getElementById('chart'));
</script>
```
The chart can be drawn with the render class method:

```javascript
chart.render();
```

The chart will be drawn in the DOM object passed as the last argument to the constructor.
