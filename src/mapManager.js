export class MapManager {
    constructor() {
        // Periksa apakah google.maps sudah terdefinisi
        if (typeof google === 'undefined' || !google.maps) {
            throw new Error('Google Maps API is not loaded');
        }
        
        this.map = null;
        this.overlay = null;
        this.mapBounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(3.224203180825914, 98.90907309153492),
            new google.maps.LatLng(3.3203997259626465, 98.99210539797713)
        );
        this.mapMinZoom = 0;
        this.mapMaxZoom = 19;
        this.initialOpacity = 75;
    }

    async init() {
        return new Promise((resolve) => {
            // Periksa apakah elemen map sudah ada
            const mapElement = document.getElementById("map");
            if (!mapElement) {
                throw new Error('Map element not found');
            }

            const options = {
                center: this.mapBounds.getCenter(),
                zoom: this.mapMaxZoom,
                mapTypeId: google.maps.MapTypeId.HYBRID,
                mapTypeControl: true,
                mapTypeControlOptions: {
                    style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                    position: google.maps.ControlPosition.TOP_LEFT
                },
                scaleControl: true,
                scaleControlOptions: {
                    position: google.maps.ControlPosition.BOTTOM_RIGHT
                }
            };

            this.map = new google.maps.Map(mapElement, options);
            
            // Set zoom level based on bounds
            google.maps.event.addListenerOnce(this.map, "projection_changed", () => {
                this.map.setZoom(this.getZoomByBounds(this.mapBounds));
            });

            // Create custom tile overlay
            this.overlay = new CustomTileOverlay(this.map, this.initialOpacity);
            this.overlay.show();

            // Add event listeners
            google.maps.event.addListener(this.map, 'tilesloaded', () => {
                this.overlay.deleteHiddenTiles(this.map.getZoom());
            });

            // Add opacity control
            this.createOpacityControl();
            
            // Resolve promise when map is ready
            resolve();
        });
    }

    getZoomByBounds(map, bounds) {
        const MAX_ZOOM = 21;
        const MIN_ZOOM = 0;

        const ne = map.getProjection().fromLatLngToPoint(bounds.getNorthEast());
        const sw = map.getProjection().fromLatLngToPoint(bounds.getSouthWest());

        const worldCoordWidth = Math.abs(ne.x - sw.x);
        const worldCoordHeight = Math.abs(ne.y - sw.y);
        const FIT_PAD = 40;
        
        for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; --zoom) {
            if (worldCoordWidth * (1 << zoom) + 2 * FIT_PAD < map.getDiv().offsetWidth &&
                worldCoordHeight * (1 << zoom) + 2 * FIT_PAD < map.getDiv().offsetHeight) {
                if (zoom > this.mapMaxZoom)
                    zoom = this.mapMaxZoom;
                return zoom;
            }
        }
        return 0;
    }

    fromMercatorPixelToLatLng(pixel, zoom) {
        const CST = 6378137 * Math.PI;
        const res = 2 * CST / 256 / Math.pow(2, zoom);
        const X = -CST + pixel.x * res;
        const Y = CST - pixel.y * res;
        const lon = X / CST * 180;
        const lat = Math.atan(Math.sinh(Y / CST * Math.PI)) / Math.PI * 180;
        return new google.maps.LatLng(lat, lon);
    }

    createOpacityControl() {
        const sliderImageUrl = "https://gdal.org/resources/gdal2tiles/opacity-slider.png";
        const OPACITY_MAX_PIXELS = 57;

        const opacityDiv = document.createElement('DIV');
        const opacityDivMargin = 5;
        opacityDiv.setAttribute("style", `margin:${opacityDivMargin}px;overflow-x:hidden;overflow-y:hidden;background:url(${sliderImageUrl}) no-repeat;width:71px;height:21px;cursor:pointer;`);

        const opacityKnobDiv = document.createElement('DIV');
        opacityKnobDiv.setAttribute("style", "padding:0;margin:0;overflow-x:hidden;overflow-y:hidden;background:url(" + sliderImageUrl + ") no-repeat -71px 0;width:14px;height:21px;");
        opacityDiv.appendChild(opacityKnobDiv);

        const opacityCtrlKnob = new ExtDraggableObject(opacityKnobDiv, {
            restrictY: true,
            container: opacityDiv
        });

        google.maps.event.addListener(opacityCtrlKnob, "dragend", () => {
            this.setOpacity(opacityCtrlKnob.valueX());
        });

        google.maps.event.addDomListener(opacityDiv, "click", (e) => {
            const left = opacityDiv.getBoundingClientRect().left;
            const x = e.pageX - left - opacityDivMargin;
            opacityCtrlKnob.setValueX(x);
            this.setOpacity(x);
        });

        this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(opacityDiv);

        const initialValue = OPACITY_MAX_PIXELS / (100 / this.initialOpacity);
        opacityCtrlKnob.setValueX(initialValue);
        this.setOpacity(initialValue);
    }

    setOpacity(pixelX) {
        const value = (100 / 57) * pixelX;
        if (value < 0) value = 0;
        if (value === 0) {
            if (this.overlay.visible === true) {
                this.overlay.hide();
            }
        } else {
            this.overlay.setOpacity(value);
            if (this.overlay.visible === false) {
                this.overlay.show();
            }
        }
    }

    getVisibleTileCount() {
        return this.overlay ? this.overlay.tiles.length : 0;
    }
}

// CustomTileOverlay class
class CustomTileOverlay {
    constructor(map, opacity) {
        this.tileSize = new google.maps.Size(256, 256);
        this.map = map;
        this.opacity = opacity;
        this.tiles = [];
        this.visible = false;
        this.initialized = false;
        this.self = this;
    }

    getTile(p, z, ownerDocument) {
        for (let n = 0; n < this.tiles.length; n++) {
            if (this.tiles[n].id == 't_' + p.x + '_' + p.y + '_' + z) {
                return this.tiles[n];
            }
        }

        const tile = ownerDocument.createElement('div');
        const tp = this.getTileUrlCoord(p, z);
        tile.id = 't_' + tp.x + '_' + tp.y + '_' + z;
        tile.style.width = this.tileSize.width + 'px';
        tile.style.height = this.tileSize.height + 'px';
        tile.style.backgroundImage = 'url(' + this.getTileUrl(tp, z) + ')';
        tile.style.backgroundRepeat = 'no-repeat';

        if (!this.visible) {
            tile.style.display = 'none';
        }

        this.tiles.push(tile);
        this.setObjectOpacity(tile);

        return tile;
    }

    deleteHiddenTiles(zoom) {
        const bounds = this.map.getBounds();
        const tileNE = this.getTileUrlCoordFromLatLng(bounds.getNorthEast(), zoom);
        const tileSW = this.getTileUrlCoordFromLatLng(bounds.getSouthWest(), zoom);

        const minX = tileSW.x - 1;
        const maxX = tileNE.x + 1;
        const minY = tileSW.y - 1;
        const maxY = tileNE.y + 1;

        const tilesToKeep = [];
        for (let i = 0; i < this.tiles.length; i++) {
            const idParts = this.tiles[i].id.split("_");
            const tileX = Number(idParts[1]);
            const tileY = Number(idParts[2]);
            const tileZ = Number(idParts[3]);
            
            const condition1 = (minX < maxX && (tileX >= minX && tileX <= maxX));
            const condition2 = (minX > maxX && ((tileX >= minX && tileX <= (Math.pow(2, zoom) - 1)) || (tileX >= 0 && tileX <= maxX)));
            const condition3 = (tileY >= minY && tileY <= maxY);
            const condition4 = (tileZ == zoom);
            
            if ((condition1 || condition2) && condition3 && condition4) {
                tilesToKeep.push(this.tiles[i]);
            } else {
                delete this.tiles[i];
            }
        }

        this.tiles = tilesToKeep;
    }

    pointToTile(point, z) {
        const projection = this.map.getProjection();
        const worldCoordinate = projection.fromLatLngToPoint(point);
        const pixelCoordinate = new google.maps.Point(
            worldCoordinate.x * Math.pow(2, z),
            worldCoordinate.y * Math.pow(2, z)
        );
        return new google.maps.Point(
            Math.floor(pixelCoordinate.x / this.tileSize.width),
            Math.floor(pixelCoordinate.y / this.tileSize.height)
        );
    }

    getTileUrlCoordFromLatLng(latlng, zoom) {
        return this.getTileUrlCoord(this.pointToTile(latlng, zoom), zoom);
    }

    getTileUrlCoord(coord, zoom) {
        const tileRange = 1 << zoom;
        const y = tileRange - coord.y - 1;
        let x = coord.x;
        if (x < 0 || x >= tileRange) {
            x = (x % tileRange + tileRange) % tileRange;
        }
        return new google.maps.Point(x, y);
    }

    getTileUrl(tile, zoom) {
        if ((zoom < 0) || (zoom > 19)) {
            return "https://gdal.org/resources/gdal2tiles/none.png";
        }
        
        const ymax = 1 << zoom;
        const y = ymax - tile.y - 1;
        
        const tileBounds = new google.maps.LatLngBounds(
            this.fromMercatorPixelToLatLng(new google.maps.Point((tile.x) * 256, (y + 1) * 256), zoom),
            this.fromMercatorPixelToLatLng(new google.maps.Point((tile.x + 1) * 256, (y) * 256), zoom)
        );
        
        const mapBounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(3.224203180825914, 98.90907309153492),
            new google.maps.LatLng(3.3203997259626465, 98.99210539797713)
        );
        
        if (mapBounds.intersects(tileBounds)) {
            return `/hasil_tiles/${zoom}/${tile.x}/${tile.y}.png`;
        } else {
            return "https://gdal.org/resources/gdal2tiles/none.png";
        }
    }

    fromMercatorPixelToLatLng(pixel, zoom) {
        const CST = 6378137 * Math.PI;
        const res = 2 * CST / 256 / Math.pow(2, zoom);
        const X = -CST + pixel.x * res;
        const Y = CST - pixel.y * res;
        const lon = X / CST * 180;
        const lat = Math.atan(Math.sinh(Y / CST * Math.PI)) / Math.PI * 180;
        return new google.maps.LatLng(lat, lon);
    }

    initialize() {
        if (this.initialized) {
            return;
        }
        const self = this.self;
        this.map.overlayMapTypes.insertAt(0, self);
        this.initialized = true;
    }

    hide() {
        this.visible = false;
        for (let n = 0; n < this.tiles.length; n++) {
            this.tiles[n].style.display = 'none';
        }
    }

    show() {
        this.initialize();
        this.visible = true;
        for (let n = 0; n < this.tiles.length; n++) {
            this.tiles[n].style.display = '';
        }
    }

    releaseTile(tile) {
        tile = null;
    }

    setOpacity(op) {
        this.opacity = op;
        for (let n = 0; n < this.tiles.length; n++) {
            this.setObjectOpacity(this.tiles[n]);
        }
    }

    setObjectOpacity(obj) {
        if (this.opacity > 0) {
            if (typeof (obj.style.filter) == 'string') {
                obj.style.filter = 'alpha(opacity:' + this.opacity + ')';
            }
            if (typeof (obj.style.KHTMLOpacity) == 'string') {
                obj.style.KHTMLOpacity = this.opacity / 100;
            }
            if (typeof (obj.style.MozOpacity) == 'string') {
                obj.style.MozOpacity = this.opacity / 100;
            }
            if (typeof (obj.style.opacity) == 'string') {
                obj.style.opacity = this.opacity / 100;
            }
        }
    }
}

// ExtDraggableObject class
function ExtDraggableObject(src, opt_drag) {
    const me = this;
    const event_ = (window["GEvent"] || google.maps.Event || google.maps.event);
    const opt_drag_ = opt_drag || {};
    let draggingCursor_ = opt_drag_.draggingCursor || "default";
    let draggableCursor_ = opt_drag_.draggableCursor || "default";
    let moving_ = false, preventDefault_;
    let currentX_, currentY_, formerY_, formerX_, formerMouseX_, formerMouseY_;
    let top_, left_;
    let mouseDownEvent_, mouseUpEvent_, mouseMoveEvent_;
    let originalX_, originalY_;
    const halfIntervalX_ = Math.round(opt_drag_.intervalX / 2);
    const halfIntervalY_ = Math.round(opt_drag_.intervalY / 2);
    const target_ = src.setCapture ? src : document;

    if (typeof opt_drag_.intervalX !== "number") {
        opt_drag_.intervalX = 1;
    }
    if (typeof opt_drag_.intervalY !== "number") {
        opt_drag_.intervalY = 1;
    }
    if (typeof opt_drag_.toleranceX !== "number") {
        opt_drag_.toleranceX = Infinity;
    }
    if (typeof opt_drag_.toleranceY !== "number") {
        opt_drag_.toleranceY = Infinity;
    }

    mouseDownEvent_ = event_.addDomListener(src, "mousedown", mouseDown_);
    mouseUpEvent_ = event_.addDomListener(target_, "mouseup", mouseUp_);

    setCursor_(false);
    if (opt_drag_.container) {

    }
    src.style.position = "absolute";
    opt_drag_.left = opt_drag_.left || src.offsetLeft;
    opt_drag_.top = opt_drag_.top || src.offsetTop;
    opt_drag_.interval = opt_drag_.interval || 1;
    moveTo_(opt_drag_.left, opt_drag_.top, false);

    function setCursor_(a) {
        if (a) {
            src.style.cursor = draggingCursor_;
        } else {
            src.style.cursor = draggableCursor_;
        }
    }

    function moveTo_(x, y, prevent) {
        let roundedIntervalX_, roundedIntervalY_;
        left_ = Math.round(x);
        top_ = Math.round(y);
        if (opt_drag_.intervalX > 1) {
            roundedIntervalX_ = Math.round(left_ % opt_drag_.intervalX);
            left_ = (roundedIntervalX_ < halfIntervalX_) ? (left_ - roundedIntervalX_) : (left_ + (opt_drag_.intervalX - roundedIntervalX_));
        }
        if (opt_drag_.intervalY > 1) {
            roundedIntervalY_ = Math.round(top_ % opt_drag_.intervalY);
            top_ = (roundedIntervalY_ < halfIntervalY_) ? (top_ - roundedIntervalY_) : (top_ + (opt_drag_.intervalY - roundedIntervalY_));
        }
        if (opt_drag_.container && opt_drag_.container.offsetWidth) {
            left_ = Math.max(0, Math.min(left_, opt_drag_.container.offsetWidth - src.offsetWidth));
            top_ = Math.max(0, Math.min(top_, opt_drag_.container.offsetHeight - src.offsetHeight));
        }
        if (typeof currentX_ === "number") {
            if (((left_ - currentX_) > opt_drag_.toleranceX || (currentX_ - (left_ + src.offsetWidth)) > opt_drag_.toleranceX) || ((top_ - currentY_) > opt_drag_.toleranceY || (currentY_ - (top_ + src.offsetHeight)) > opt_drag_.toleranceY)) {
                left_ = originalX_;
                top_ = originalY_;
            }
        }
        if (!opt_drag_.restrictX && !prevent) {
            src.style.left = left_ + "px";
        }
        if (!opt_drag_.restrictY && !prevent) {
            src.style.top = top_ + "px";
        }
    }

    function mouseMove_(ev) {
        const e = ev || event;
        currentX_ = formerX_ + ((e.pageX || (e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft)) - formerMouseX_);
        currentY_ = formerY_ + ((e.pageY || (e.clientY + document.body.scrollTop + document.documentElement.scrollTop)) - formerMouseY_);
        formerX_ = currentX_;
        formerY_ = currentY_;
        formerMouseX_ = e.pageX || (e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft);
        formerMouseY_ = e.pageY || (e.clientY + document.body.scrollTop + document.documentElement.scrollTop);
        if (moving_) {
            moveTo_(currentX_, currentY_, preventDefault_);
            event_.trigger(me, "drag", {
                mouseX: formerMouseX_,
                mouseY: formerMouseY_,
                startLeft: originalX_,
                startTop: originalY_,
                event: e
            });
        }
    }

    function mouseDown_(ev) {
        const e = ev || event;
        setCursor_(true);
        event_.trigger(me, "mousedown", e);
        if (src.style.position !== "absolute") {
            src.style.position = "absolute";
            return;
        }
        formerMouseX_ = e.pageX || (e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft);
        formerMouseY_ = e.pageY || (e.clientY + document.body.scrollTop + document.documentElement.scrollTop);
        originalX_ = src.offsetLeft;
        originalY_ = src.offsetTop;
        formerX_ = originalX_;
        formerY_ = originalY_;
        mouseMoveEvent_ = event_.addDomListener(target_, "mousemove", mouseMove_);
        if (src.setCapture) {
            src.setCapture();
        }
        if (e.preventDefault) {
            e.preventDefault();
            e.stopPropagation();
        } else {
            e.cancelBubble = true;
            e.returnValue = false;
        }
        moving_ = true;
        event_.trigger(me, "dragstart", {
            mouseX: formerMouseX_,
            mouseY: formerMouseY_,
            startLeft: originalX_,
            startTop: originalY_,
            event: e
        });
    }

    function mouseUp_(ev) {
        const e = ev || event;
        if (moving_) {
            setCursor_(false);
            event_.removeListener(mouseMoveEvent_);
            if (src.releaseCapture) {
                src.releaseCapture();
            }
            moving_ = false;
            event_.trigger(me, "dragend", {
                mouseX: formerMouseX_,
                mouseY: formerMouseY_,
                startLeft: originalX_,
                startTop: originalY_,
                event: e
            });
        }
        currentX_ = currentY_ = null;
        event_.trigger(me, "mouseup", e);
    }

    me.moveTo = function (point) {
        moveTo_(point.x, point.y, false);
    };

    me.moveBy = function (size) {
        moveTo_(src.offsetLeft + size.width, src.offsetHeight + size.height, false);
    }

    me.setDraggingCursor = function (cursor) {
        draggingCursor_ = cursor;
        setCursor_(moving_);
    };

    me.setDraggableCursor = function (cursor) {
        draggableCursor_ = cursor;
        setCursor_(moving_);
    };

    me.left = function () {
        return left_;
    };

    me.top = function () {
        return top_;
    };

    me.valueX = function () {
        const i = opt_drag_.intervalX || 1;
        return Math.round(left_ / i);
    };

    me.valueY = function () {
        const i = opt_drag_.intervalY || 1;
        return Math.round(top_ / i);
    };

    me.setValueX = function (value) {
        moveTo_(value * opt_drag_.intervalX, top_, false);
    };

    me.setValueY = function (value) {
        moveTo_(left_, value * opt_drag_.intervalY, false);
    };

    me.preventDefaultMovement = function (prevent) {
        preventDefault_ = prevent;
    };
}