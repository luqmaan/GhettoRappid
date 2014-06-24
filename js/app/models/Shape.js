define(['jquery', 'leaflet', 'when', 'config'],
function($, leaflet, when, config) {
    function Shape(route, direction) {
        this.route = route;
        this.direction = direction;
        this._shape = [];
    }

    Shape.prototype = {
        fetch: function() {
            var deferred = when.defer();

            $.ajax({
                url: 'data/shapes_' + this.route + '_' + this.direction + '.json'
            }).done(
                function(data) {
                    this._shape = data.map(function(el) {
                        return new L.LatLng(el.shape_pt_lat, el.shape_pt_lon);
                    });
                    deferred.resolve();
                }.bind(this)
            ).fail(
                function(xhr, status, err) {
                    console.error(err);
                    deferred.reject(err);
                }
            );

            return deferred.promise;
        },
        draw: function(layer) {
            var color ='rgb(199,16,22)',
                line = new L.Polyline(this._shape, {
                    color: color,
                    stroke: true,
                    weight: 5,
                    opacity: 0.9,
                    smoothFactor: 1,
                    zIndexOffset: config.shapeZIndex
                });
            line.addTo(layer);
        }
    };

    return Shape;
});
