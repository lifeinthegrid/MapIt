/**
 * MapIt Pro (jQuery powered google map) Plugin
 * version: 0.0.1 (05-11-2011)
 * @requires jQuery v1.5.2 or later
 * @requires jQuery v1.8.12 or later
 *
 * Documentation:
 * 		http://www.lifeinthegrid.com/mapit
 *
 * Copyright 2011-2012 Cory Lamle, Ryan Heideman <cory@lifeinthegrid.com, ryan@lifeinthegrid.com>
 *
 * Dual licensed under the MIT licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */

mapit = function (options)
{
    'use strict';

    //#region Fields
    var _opts = {
        accordionAnimation: true,
        accordionAutoSelect: false,
        accordionShowSubLinks: true,
        allowClustering: true,
        bubbleCenter: false,
        bubbleShowAtStart: true,
        bubbleShowCoordinates: false,
        bubbleShowSubLinks: false,
        coordinatesInDirections: true,
        dataSource: mapit.xmlDataSource,
        dataSourceOptions: {},
        detailsShow: false,
        detailsShowIcon: false,
        detailsShowCoordinates: false,
        markerClustererOptions: null,
        markerIcon: null,
        markersLimitDisplay: false,
        navBarLocation: "left",
        panx: 0,
        pany: 0,
        searchShow: true,
        searchText: "Search",
        searchFunc: null,
        startCoordinates: "33.471545,-111.956177",
        title: "",
        zoomlevel: 10
    };

    // backwards compatibility support
    if (options.startCordinates != null && options.startCordinates.length > 0)
    {
        options.startCoordinates = options.startCordinates; // use correct spelling
    }

    _opts = jQuery.extend({}, _opts, options);

    var _this = this;
    var _dataSource;
    var orgOpts = options;
    var defaultCat = 0;
    var defaultCatId = "";
    var _categoryClicked = false;
    var _categories;
    var _templates;
    var _currentCategory;
    var _searchLocations = [];
    var _mapOptions;
    var _markerClusters = null;
    var _themeVersion = "1.8.12";
    var _themeUrl = "http://ajax.googleapis.com/ajax/libs/jqueryui/{0}/themes/{1}/jquery-ui.css";
    var _templateRegEx = /{{[0-9a-z]*}}/ig;

    var _scriptSource = document.getElementById("mapit-source");
    var _scriptExtractPoint = (_scriptSource.src.indexOf('jquery.mapit.js') == -1) ? _scriptSource.src.indexOf('jquery.mapit.min.js') : _scriptSource.src.indexOf('jquery.mapit.js');
    var _imageSource = _scriptSource.src.substr(0, _scriptExtractPoint) + "images/";

    // generate a new id
    mapit.globals.lastId++;
    var idExt = (mapit.globals.lastId > 1 ? mapit.globals.lastId : "");

    var controlIds = {
        idExt: idExt,
        contentId: "mapit-content" + idExt,
        accordionContainerId: "mapit-accordion" + idExt,
        accordionId: "mapit-accordion-content" + idExt,
        mapContentId: "mapit-map-content" + idExt,
        mapEmbedId: "mapit-map-embed" + idExt,
        mapBubbleId: "mapit-map-embed-bubble" + idExt,
        navId: "mapit-nav" + idExt,
        titleId: "mapit-infobar-title" + idExt,
        infoContentId: "mapit-infobar-content" + idExt,
        listId: "mapit-details" + idExt,
        searchBarId: "mapit-search-bar" + idExt,
        searchId: "mapit-search" + idExt,
        searchClearId: "mapit-search-clear" + idExt,
        searchResultsId: "mapit-search-results" + idExt,
        searchResultsContentId: "mapit-search-results-content" + idExt,
        searchResultsContentItemsId: "mapit-search-results-content-items" + idExt
    };
    //#endregion

    //#region Private Methods
    var _buildHtml = function (container)
    {
        var acc = "<div class='mapit " + mapit.utils.getBrowserType() + " " + mapit.utils.getBrowserSubType() + "'>";

        if (_opts.title.length > 0)
        {
            acc += "<div class='mapit-title ui-accordion-header ui-state-active ui-corner-top'><label>" + _opts.title + "</label></div>";
        }

        acc += "<div id='" + controlIds.contentId + "' class='mapit-content'>";
        acc += _buildAccordion(container);
        acc += "<div id='" + controlIds.mapContentId + "' class='mapit-map-content'>";
        acc += "<div id='" + controlIds.mapEmbedId + "' class='mapit-embed'></div>";
        acc += "</div>"; // end mapit-map-content

        acc += "<div style='clear:both;'></div>";
        acc += "</div>"; // end mapit-content

        acc += "<div id='" + controlIds.listId + "' class='mapit-details'></div>";

        acc += "</div>";

        container.html(acc);

        // setup events
        jQuery("#" + controlIds.accordionId).find("a[name='loc']").click(function () { _showInfo(_getLocationById(parseInt(jQuery(this).attr("locid")))); });

        _resize();

        mapit.globals.accordionIds.push(controlIds.accordionId);

        jQuery("#" + controlIds.accordionId).accordion({
            fillSpace: true,
            animated: _opts.accordionAnimation,
            active: defaultCat,
            change: function (event, ui) { _showCategory(ui.newHeader.context.getAttribute("catid")); }
        });

        GMAP.loadMap();
        _showCategory(defaultCatId, true);

        var $searchId = jQuery('#' + controlIds.searchId);
        var $searchClear = jQuery('#' + controlIds.searchClearId);

        var toggleClear = function (searchText)
        {
            if (searchText == _opts.searchText || searchText == "")
            {
                $searchClear.css("visibility", "hidden");
            }
            else
            {
                $searchClear.css("visibility", "visible");
            }
        };

        $searchClear.find("a").click(function ()
        {
            _search("", _this);
            $searchId.attr("value", _opts.searchText);
            $searchId.removeClass('mapit-search-text-active');
            toggleClear("");
        });

        $searchId.focus(function ()
        {
            if (this.value == _opts.searchText)
            {
                this.value = "";
                jQuery(this).addClass('mapit-search-text-active');
            }
        });

        $searchId.blur(function ()
        {
            if (this.value == "")
            {
                this.value = _opts.searchText;
                jQuery(this).removeClass('mapit-search-text-active');
            }

            toggleClear(this.value);
        });

        $searchId.keyup(function ()
        {
            toggleClear(this.value);
            _search(this.value.toLowerCase(), _this);
        });

        jQuery(window).resize(function ()
        {
            var navWidth = jQuery('div.mapit-navigation').width();
            if (navWidth >= 50)
            {
                jQuery('div.mapit-search-content input').width(navWidth - 62);
            }
        });

        jQuery(window).resize();
    };
    var _buildAccordion = function ()
    {
        var acc = "";
        var defaultSet = false;

        acc += "<div id='" + controlIds.navId + "' class='mapit-navigation'>"

        //SearchBox
        if (_opts.searchShow)
        {
            acc += "<div id='" + controlIds.searchBarId + "' class='mapit-search-content'>";
            acc += "<input id='" + controlIds.searchId + "' type='text' class='mapit-search-text' value='" + _opts.searchText + "' />";
            acc += "<div id='" + controlIds.searchClearId + "' class='mapit-search-clear'><a href='javascript:void(0);' title='Clear'></a></div>";
            acc += "</div>";

            acc += "<div id='" + controlIds.searchResultsId + "' class='mapit-search-results ui-corner-top' style='display:none;'>";
            acc += "<h3 class='mapit-search-results-title ui-helper-reset ui-state-default ui-state-default ui-corner-top header'><span>Search Results</span></h3>";
            acc += "<div id='" + controlIds.searchResultsContentId + "' class='mapit-search-results-content ui-helper-reset ui-widget-content ui-corner-bottom'>";
            acc += "<div id='" + controlIds.searchResultsContentItemsId + "' class='mapit-search-results-content-items'>";
            acc += "</div></div></div>";
        }

        acc += "<div id='" + controlIds.accordionContainerId + "'>";
        acc += "<div class='mapit-accordion' id='" + controlIds.accordionId + "'>"


        jQuery.each(_categories, function (catIndex, category)
        {
            var catId = category.get_id();
            var eleId = controlIds.accordionId + "-cat" + catId;

            if (catIndex == 0)
            {
                defaultCatId = catId;
                _currentCategory = category;
            }

            acc += "<h3 id='" + eleId + "' catid='" + catId + "'><a href='#'>" + category.get_name() + "</a></h3>";
            acc += "<div>";

            var isDefault = false;
            if (!defaultSet && category.get_isDefault())
            {
                _currentCategory = category;
                defaultCat = catIndex;
                defaultCatId = catId;
                isDefault = true;
            }

            var locations = category.get_locations();

            jQuery.each(locations, function (locIndex, location)
            {
                var locId = location.get_id();
                var locName = location.get_name();
                var eleId = catId + "-loc" + locId;
                var linkEleId = catId + "-loc" + locId + "-lnk";

                // check for the overwrite of the default
                if (_isDefaultLocation(locName))
                {
                    _currentCategory = category;
                    defaultCat = catIndex;
                    defaultCatId = catId;
                    isDefault = true;
                }

                acc += "<a href='javascript:void(0);' id='" + eleId + "' locid='" + locId + "' name='loc' class='mapit-accordion-link'>" + locName + "</a>";

                if (isDefault && !defaultSet)
                {
                    defaultSet = true;
                }

                if (_opts.accordionShowSubLinks)
                {
                    acc += _createLocationLinkHtml(location, linkEleId, "lnk", "mapit-accordion-link mapit-accordion-link-sublink", "", "", "", "");
                }
            });

            acc += "</div>";
        });

        acc += "</div>"; // end accordion
        acc += "</div>"; // end accordion container
        acc += "</div>"; // end navigation

        return acc;
    };
    var _showInfo = function (location, disableZoom, isSwitchingCategory)
    {
        if (!disableZoom)
        {
            GMAP.zoomIn(location);
        }

        GMAP.showContent(location, isSwitchingCategory);
    };
    var _showCategory = function (id, isDefault)
    {
        var category = _getCategoryById(id);

        if (_opts.markersLimitDisplay && category != _currentCategory)
        {
            GMAP.toggleMarkers(_currentCategory, category);
        }

        _currentCategory = category;

        if (_opts.detailsShow)
        {
            var locations = category.get_locations();
            var html = "";
            var hasTabs = false;

            jQuery.each(locations, function (locIndex, loc)
            {
                var templateId = loc.get_detailTemplateId();

                // check if the category has a template defined
                if (templateId == null || templateId.length == 0)
                {
                    templateId = category.get_detailTemplateId();
                }

                html += "<div class='mapit-details-item ui-widget ui-widget-content ui-corner-all'>";

                if (templateId != null && templateId.length > 0) // apply the template if defined
                {
                    var template = _getTemmplateById(templateId);
                    if (template == null)
                    {
                        throw "Invalid template ID";
                    }

                    var tabs = template.get_tabs();

                    if (tabs.length > 0)
                    {
                        html += "<div class='mapit-details-template-tabs'><ul>";

                        for (var i = 0; i < tabs.length; i++)
                        {
                            html += "<li><a href='#" + controlIds.mapBubbleId + "template-tab-" + i + "'>" + tabs[i].get_name() + "</a></li>";
                        }

                        html += "</ul>";

                        for (var i = 0; i < tabs.length; i++)
                        {
                            html += "<div id='" + controlIds.mapBubbleId + "template-tab-" + i + "' class='mapit-details-template-tabs-panel'>";
                            html += _parseLocationTemplate(loc, tabs[i].get_html());
                            html += "</div>";
                        }

                        html += "</div>";

                        hasTabs = true;
                    }
                    else
                    {
                        html += _parseLocationTemplate(loc, template.get_html());
                    }
                }
                else
                {
                    html += "<table cellpadding='0' cellspacing='0'><tr>";

                    if (_opts.detailsShowIcon)
                    {
                        html += "<td class='mapit-details-item-col1 mapit-details-item-icon'><img src='" + loc.get_icon() + "' /></td>";
                    }
                    else
                    {
                        html += "<td class='mapit-details-item-col1'><span class='mapit-details-item-num'>" + (locIndex + 1) + ".</span></td>";
                    }

                    html += "<td class='mapit-details-item-col2'>"
                    html += "<div><a href='javascript:void(0);' locid='" + loc.get_id() + "' name='loc'>" + loc.get_name() + "</a></div>";
                    html += "<div class='mapit-details-item-address'>" + loc.get_address() + "</div>";
                    html += "<div class='mapit-details-item-address'>" + loc.get_city() + ", " + loc.get_state() + " " + loc.get_zip() + "</div>";

                    if (_opts.detailsShowCoordinates)
                    {
                        html += "<div class='mapit-details-item-address'>" + loc.get_cords() + "</div>";
                    }

                    html += "</td>";

                    var cords = loc.get_cords().split(',');
                    var latLng = { lat: cords[0], lng: cords[1] };
                    var address = loc.get_address() + ', ' + loc.get_city() + ', ' + loc.get_state() + ' ' + loc.get_zip() + (_opts.coordinatesInDirections ? "@" + latLng.lat + "," + latLng.lng : "");
                    html += "<td class='mapit-details-item-col3'>"
                    html += "<a href='http://maps.google.com/maps?saddr=&daddr=" + encodeURIComponent(address).replace(/'/g, "%27") + "' target='_blank' class='mapit-details-item-directions'>Get Directions</a>";
                    html += "</td>";

                    html += "</tr></table>";
                }

                html += "</div>";
            });

            html += "";

            jQuery("#" + controlIds.listId).html(html);

            if (hasTabs)
            {
                jQuery("#" + controlIds.listId).find(".mapit-details-template-tabs").tabs();
            }

            // setup events
            jQuery("#" + controlIds.listId).find("a[name='loc']").click(function () { _showInfo(_getLocationById(parseInt(jQuery(this).attr("locid")))); document.getElementById(controlIds.mapEmbedId).scrollIntoView(); });
        }

        // check for the category default zoom
        if (!isDefault)
        {
            var zoom = category.get_zoomLevel();
            if (zoom != null)
            {
                GMAP.zoomIn(category);
            }
        }

        // select the first node when the accordion is changed
        if (_opts.accordionAutoSelect)
        {
            var locations = category.get_locations();
            jQuery.each(locations, function (locIndex, loc)
            {
                //In case a mapitloc query string is passed in
                if (_categoryClicked)
                {
                    _showInfo(loc, true, true);
                }
                return false;
            });
        }

        _categoryClicked = true;
    };
    var _getCategoryById = function (catId)
    {
        var category = null;

        jQuery.each(_categories, function (index, cat)
        {
            if (cat.get_id() == catId)
            {
                category = cat;
                return;
            }
        });

        return category;
    };
    var _getLocationById = function (locId)
    {
        var location = null;

        jQuery.each(_categories, function (index, cat)
        {
            var locations = cat.get_locations();

            jQuery.each(locations, function (index, loc)
            {
                if (loc.get_id() == locId)
                {
                    location = loc;
                    return;
                }
            });

            if (location != null)
            {
                return;
            }
        });

        return location;
    };
    var _getTemmplateById = function (templId)
    {
        var template = null;
        var templates = data._getTemplates();

        jQuery.each(templates, function (index, templ)
        {
            if (templ.get_id() == templId)
            {
                template = templ;
                return;
            }
        });

        return template;
    };
    var _resize = function (resizeAccordion)
    {
        var navHeight = jQuery("#" + controlIds.navId).height();

        if (_opts.searchShow)
        {
            var barHeight = jQuery("#" + controlIds.searchBarId).height();
            jQuery("#" + controlIds.accordionContainerId).height(navHeight - barHeight - 8);
        }
        else
        {
            jQuery("#" + controlIds.accordionContainerId).height(navHeight);
        }

        if (resizeAccordion)
        {
            jQuery("#" + controlIds.accordionId).accordion("resize");
        }
    };
    var _search = function (searchText)
    {
        var html = "";

        if (searchText.length == 0)
        {
            if (_opts.markersLimitDisplay)
            {
                GMAP.closeBubble();
                GMAP.toggleMarkers(null, _currentCategory);
            }

            _searchLocations.length = 0;
            jQuery("#" + controlIds.searchResultsId).css("display", "none");
            jQuery("#" + controlIds.accordionContainerId).css("display", "block");
            _resize(true);
        }
        else
        {
            if (_opts.markersLimitDisplay)
            {
                GMAP.closeBubble();
            }

            jQuery("#" + controlIds.accordionContainerId).css("display", "none");
            jQuery("#" + controlIds.searchResultsId).css("display", "block");

            var searchMatchFunc = (_opts.searchFunc || _searchMatches);

            jQuery.each(_categories, function (catIndex, cat)
            {
                var catId = cat.get_id();
                var locations = cat.get_locations();

                jQuery.each(locations, function (index, loc)
                {
                    if (searchMatchFunc(searchText, loc, cat))
                    {
                        _searchLocations.push(loc);

                        if (_opts.markersLimitDisplay)
                        {
                            GMAP.toggleMarker(loc, true);
                        }

                        var locId = loc.get_id();
                        var locName = loc.get_name();
                        var eleId = catId + "-loc" + locId + "-results";

                        html += "<a href='javascript:void(0);' id='" + eleId + "' locid='" + locId + "' name='loc' class='mapit-accordion-link'>" + locName + "</a>";
                    }
                    else
                    {
                        if (_opts.markersLimitDisplay)
                        {
                            GMAP.toggleMarker(loc, false);
                        }
                    }
                });
            });

            if (html.length == 0)
            {
                html += "<div class='mapit-search-results-none'>No results found</div>";
            }

            var navHeight = jQuery("#" + controlIds.navId).height();

            if (_opts.searchShow)
            {
                var barHeight = jQuery("#" + controlIds.searchBarId).height();
                var titleHeight = jQuery("#" + controlIds.searchResultsId + " h3").height();
                jQuery("#" + controlIds.searchResultsContentId).height(navHeight - barHeight - titleHeight - 10);
            }
            else
            {
                jQuery("#" + controlIds.searchResultsContentId).height(navHeight);
            }
        }

        jQuery("#" + controlIds.searchResultsContentItemsId).html(html);

        // setup events
        jQuery("#" + controlIds.searchResultsContentItemsId).find("a[name='loc']").click(function () { _showInfo(_getLocationById(parseInt(jQuery(this).attr("locid")))); });
    };
    var _searchMatches = function (searchText, location, category)
    {
        var isMatch = false;
        var locName = location.get_name();

        if (locName && locName.toLowerCase().indexOf(searchText) > -1)
        {
            isMatch = true;
        }

        return isMatch;
    };
    var _getMapQueryOptions = function ()
    {
        if (_mapOptions == null)
        {
            _mapOptions = {
                loc: mapit.utils.qs("mapitloc"),
                zoom: mapit.utils.parseInt(mapit.utils.qs("mapitzoom"), null),
                panX: mapit.utils.parseInt(mapit.utils.qs("mapitpanx"), null),
                panY: mapit.utils.parseInt(mapit.utils.qs("mapitpany"), null)
            };
        }

        return _mapOptions;
    };
    var _isDefaultLocation = function (loc)
    {
        var isDefault = false;

        var mo = _getMapQueryOptions();

        if (mo != null && mo.loc && loc && mo.loc.toLowerCase() == loc.toLowerCase())
        {
            isDefault = true;
        }

        return isDefault;
    };
    var _parseLocationTemplate = function (location, html)
    {
        var matches = html.match(_templateRegEx);

        if (matches != null)
        {
            for (var i = 0; i < matches.length; i++)
            {
                var match = matches[i];
                var propName = match.substring(0, match.length - 2).substring(2);
                var propVal = location.getProperty(propName);

                if (mapit.utils.isArray(propVal))
                {
                    if (propVal.length > 0 && propVal[0] instanceof mapit.link) // array of mapit links
                    {
                        propVal = _createLocationLinkHtml(location, "", "templ-lnk", "mapit-template-sublink", "<ul class='mapit-template-sublink'>", "</ul>", "<li>", "</li>");
                    }
                    else // array of objects
                    {
                        var html = "<ul class='mapit-template-array'>";

                        for (var i = 0; i < propVal.length; i++)
                        {
                            html += "<li>" + propVal[i] + "</li>";
                        }

                        html += "</ul>";

                        propVal = html;
                    }
                }

                html = html.replace(new RegExp(match, "g"), propVal);
            }
        }

        return html;
    };
    var _createLocationLinkHtml = function (location, eleSubId, eleName, eleClass, startTag, endTag, startItemTag, endItemTag)
    {
        var html = "";

        var links = location.get_links();

        if (links.length > 0)
        {
            html += startTag;

            jQuery.each(links, function (linkIndex, link)
            {
                var linkId = link.get_id();
                var linkName = link.get_name();
                var linkUrl = link.get_url();
                var linkTarget = link.get_target();
                var linkCss = (link.get_cssClass() || "");
                var eleId = eleSubId + linkId;

                html += startItemTag + "<a href='" + linkUrl + "' target='" + linkTarget + "' id='" + eleId + "' lnkid='" + linkId + "' name='" + eleName + "' class='" + eleClass + " " + linkCss + "'>" + linkName + "</a>" + endItemTag;
            });

            html += endTag;
        }

        return html;
    };
    //#endregion

    //========================================================================
    //Data Source
    //========================================================================
    //#region Data Source Routines
    var data = {
        //#region Data Methods
        _getDataAsync: function (onComplete)
        {
            if (_categories == null)
            {
                _dataSource.getDataAsync(function (categories)
                {
                    _categories = categories;
                    onComplete(_categories);
                });
            }
            else
            {
                onComplete(_categories);
            }
        },
        _getTemplates: function ()
        {
            if (_templates == null)
            {
                _templates = _dataSource.getTemplates();
            }

            return _templates;
        }
        //#endregion
    };
    //#endregion

    //#region Public Methods
    this.init = function (container)
    {
        _dataSource = new _opts.dataSource(_this, _opts.dataSourceOptions);
        _dataSource.getDataAsync(function (categories)
        {
            _categories = categories;
            _buildHtml(container);
        });
    };
    this.applyTheme = function (theme, version)
    {
        /// <summary>
        /// Sets the theme to the google cdn theme file.
        /// </summary>

        version = version || _themeVersion;

        var themeUrl = _themeUrl.replace("{0}", version).replace("{1}", theme);

        var linkCss = document.getElementById("mapitcss");
        if (linkCss != null)
        {
            var currentUrl = jQuery(linkCss).attr("href");
            if (currentUrl != themeUrl)
            {
                jQuery(linkCss).attr("href", themeUrl);

                // wait for the theme to download and then redraw
                setTimeout(function ()
                {
                    for (var i = 0; i < mapit.globals.accordionIds.length; i++)
                    {
                        jQuery("#" + mapit.globals.accordionIds[i]).accordion("resize");
                    }
                }, 500);
            }
        }
        else
        {
            jQuery(document.createElement('link')).attr({
                href: themeUrl,
                id: "mapitcss",
                media: 'screen',
                type: 'text/css',
                rel: 'stylesheet'
            }).appendTo('head');
        }
    };
    this.applyClusterOptions = function (opts)
    {
        if (_opts.allowClustering && typeof (MarkerClusterer) != "undefined")
        {
            _opts.markerClustererOptions = opts;
            GMAP.resetClonedMark();
            GMAP.applyClustering();
        }
    };
    this.get_options = function ()
    {
        return _opts;
    };
    this.set_options = function (newOpts)
    {
        _opts = newOpts;
    };
    //#endregion

    var GMAP = {
        //#region Private Fields
        _map: null,
        _infoWindow: null,
        _marks: [],
        _lastLocation: null,
        _clonedMark: null,
        //#endregion

        //#region Private Methods
        loadMap: function ()
        {
            var startCords = _opts.startCoordinates.split(",");
            var currentzoom = parseInt(_opts.zoomlevel) || 10;
            var mapOpts =
			{
			    zoom: currentzoom,
			    center: new google.maps.LatLng(parseFloat(startCords[0]), parseFloat(startCords[1])),
			    mapTypeId: _opts.mapType
			};

            var panX = _opts.panx;
            var panY = _opts.pany;

            // check for the category default zoom
            if (_currentCategory)
            {
                var zoom = _currentCategory.get_zoomLevel();
                if (zoom != null)
                {
                    mapOpts.zoom = zoom;
                }
            }

            // update the map settings for the pro version
            var mo = _getMapQueryOptions();
            if (mo.zoom) mapOpts.zoom = mo.zoom;
            if (mo.panX) panX = mo.panX;
            if (mo.panY) panY = mo.panY;

            GMAP._map = new google.maps.Map(document.getElementById(controlIds.mapEmbedId), mapOpts);

            // moves the map by x and y pixels
            if (typeof (GMAP._map.panBy) == 'function')
            {
                GMAP._map.panBy(panX, panY);
            }

            GMAP._infoWindow = new google.maps.InfoWindow();
            google.maps.event.addListener(GMAP._map, 'click', GMAP.closeBubble);

            // when the info bubble is ready generate the tabs
            google.maps.event.addListener(GMAP._infoWindow, 'domready', function ()
            {
                var $mapBubbleId = jQuery("#" + controlIds.mapBubbleId);
                if ($mapBubbleId.length > 0)
                {
                    var $parent = $mapBubbleId.parent();
                    var $root = $parent.parent();
                    var $closeContainer = jQuery($root.parent()[0].firstChild);

                    $root.addClass("mapit-google-infobubble");
                    $closeContainer.addClass("mapit-google-infobubble-close");

                    if ($mapBubbleId.hasClass("ui-tabs"))
                    {
                        $mapBubbleId.height("100%");
                        $mapBubbleId.find(".mapit-embed-bubble-tabs-panel").height($root.height() - 10);
                        $mapBubbleId.find(".ui-tabs-nav").css("display", "block");

                        $root.addClass("mapit-google-infobubble-tabs");
                        $parent.addClass("mapit-google-infobubble-tabs-container");

                        $mapBubbleId.tabs();
                    }
                }
            });

            google.maps.event.addListener(GMAP._infoWindow, 'closeclick', GMAP.resetClonedMark);
            google.maps.event.addListener(GMAP._map, 'zoom_changed', GMAP.resetClonedMark);

            var firstLoc;

            jQuery.each(_categories, function (catIndex, cat)
            {
                var locations = cat.get_locations();

                jQuery.each(locations, function (locIndex, loc)
                {
                    // create the google marker
                    var mark = GMAP.createMarker(loc);
                    loc.setProperty("mapit-marker", mark);

                    // hide the marker if the option is set to only show the current category
                    if (_opts.markersLimitDisplay && cat != _currentCategory)
                    {
                        mark.setVisible(false);
                    }

                    // check if this is the default
                    if (firstLoc == null || loc.get_isDefault())
                    {
                        firstLoc = loc;
                    }

                    if (_isDefaultLocation(loc.get_name()))
                    {
                        firstLoc = loc;
                    }
                });
            });

            if (firstLoc && _opts.bubbleShowAtStart)
            {
                _showInfo(firstLoc, true);
                GMAP._map.setCenter(firstLoc.getProperty("mapit-marker").getPosition());
            }

            GMAP.applyClustering();
        },
        createMarker: function (loc, skipAdd)
        {
            var tag_cords = loc.get_cords().split(",");

            var markerOpts = {
                map: GMAP._map,
                position: new google.maps.LatLng(parseFloat(tag_cords[0]), parseFloat(tag_cords[1]))
            };

            var mrk = new google.maps.Marker(markerOpts);

            google.maps.event.addListener(mrk, 'click', function () { _showInfo(loc, true); });

            if (_opts.markerIcon)
            {
                mrk.setIcon(_opts.markerIcon);
            }

            var markerIcon = loc.get_icon();
            if (markerIcon && markerIcon.length > 0)
            {
                mrk.setIcon(markerIcon);
            }

            if (!skipAdd)
            {
                GMAP._marks.push(mrk);
            }

            return mrk;
        },
        showContent: function (location, isSwitchingCategory)
        {
            GMAP._lastLocation = location;

            var html = "";
            var locId = location.get_id();
            var catId = location.get_catId();
            var templateId = location.get_bubbleTemplateId();

            // check if the category has a template defined
            if (templateId == null || templateId.length == 0)
            {
                var cat = _getCategoryById(catId);
                if (cat != null)
                {
                    templateId = cat.get_bubbleTemplateId();
                }
            }

            if (templateId != null && templateId.length > 0) // apply the template if defined
            {
                var template = _getTemmplateById(templateId);
                if (template == null)
                {
                    throw "Invalid template ID";
                }

                var tabs = template.get_tabs();

                if (tabs.length > 0)
                {
                    html += "<div id='" + controlIds.mapBubbleId + "' class='mapit-embed-bubble ui-tabs ui-widget ui-widget-content ui-corner-all'><ul class='ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all' style='display:none;'>";

                    for (var i = 0; i < tabs.length; i++)
                    {
                        html += "<li class='ui-state-default ui-corner-top" + (i == 0 ? " ui-tabs-selected ui-state-active" : "") + "'><a href='#" + controlIds.mapBubbleId + "tab-" + i + "'>" + tabs[i].get_name() + "</a></li>";
                    }

                    html += "</ul>";

                    for (var i = 0; i < tabs.length; i++)
                    {
                        html += "<div id='" + controlIds.mapBubbleId + "tab-" + i + "' class='mapit-embed-bubble-tabs-panel ui-tabs-panel ui-widget-content ui-corner-bottom" + (i == 0 ? "" : " ui-tabs-hide") + "'>";
                        html += _parseLocationTemplate(location, tabs[i].get_html());
                        html += "</div>";
                    }

                    html += "</div>";
                }
                else
                {
                    html += "<div class='mapit-embed-bubble mapit-embed-bubble-panel ui-widget'>";
                    html += _parseLocationTemplate(location, template.get_html());
                    html += "</div>";
                }
            }
            else // use the default html
            {
                var cords = location.get_cords().split(',');
                var latLng = { lat: cords[0], lng: cords[1] };
                var address = location.get_address() + ', ' + location.get_city() + ', ' + location.get_state() + ' ' + location.get_zip() + (_opts.coordinatesInDirections ? "@" + latLng.lat + "," + latLng.lng : "");
                var displayAddress = location.get_address() + '<br/>' + location.get_city() + ', ' + location.get_state() + ' ' + location.get_zip() + (_opts.bubbleShowCoordinates ? "<br/>" + location.get_cords() : "");
                var encodedAddress = encodeURIComponent(address).replace(/'/g, "%27");
                var link = "<a href='http://maps.google.com/maps?saddr=&daddr=" + encodedAddress + "' target='_blank' class='mapit-bubble-directions'>Get Directions...</a>";
                var addressHtml = "<span class='mapit-bubble-title'>" + location.get_name() + "</span><br/><span class='mapit-bubble-address'>" + displayAddress + "</span>" + (location.get_showDirectionsLink() ? "<br/>" + link : "");
                var locInfo = location.get_info();
                var linkEleId = catId + "-loc" + locId + "-bubble-lnk";

                if (locInfo != null && locInfo.length > 0)
                {
                    var html = "<div id='" + controlIds.mapBubbleId + "' class='mapit-embed-bubble ui-tabs ui-widget ui-widget-content ui-corner-all'><ul class='ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all' style='display:none;'>";
                    html += "<li class='ui-state-default ui-corner-top ui-tabs-selected ui-state-active'><a href='#" + controlIds.mapBubbleId + "tab-0'>Address</a></li>";
                    html += "<li class='ui-state-default ui-corner-top'><a href='#" + controlIds.mapBubbleId + "tab-1'>Info</a></li></ul>";
                    html += "<div id='" + controlIds.mapBubbleId + "tab-0' class='mapit-embed-bubble-tabs-panel ui-tabs-panel ui-widget-content ui-corner-bottom'>";
                    html += addressHtml;

                    if (_opts.bubbleShowSubLinks)
                    {
                        html += _createLocationLinkHtml(location, linkEleId, "bubble-lnk", "mapit-bubble-sublink", "<ul class='mapit-bubble-sublinks'>", "</ul>", "<li>", "</li>");
                    }

                    html += "</div>";
                    html += "<div id='" + controlIds.mapBubbleId + "tab-1' class='mapit-embed-bubble-tabs-panel ui-tabs-panel ui-widget-content ui-corner-bottom ui-tabs-hide'>";
                    html += locInfo;
                    html += "</div>";
                    html += "</div>";
                }
                else
                {
                    html += "<div class='mapit-embed-bubble mapit-embed-bubble-panel ui-widget'>";
                    html += addressHtml;

                    if (_opts.bubbleShowSubLinks)
                    {
                        html += _createLocationLinkHtml(location, linkEleId, "bubble-lnk", "mapit-bubble-sublink", "<ul class='mapit-bubble-sublinks'>", "</ul>", "<li>", "</li>");
                    }

                    html += "</div>";
                }
            }

            var marker = location.getProperty("mapit-marker");

            if (_opts.allowClustering)
            {
                GMAP.resetClonedMark();

                if (marker.getMap() == null)
                {
                    GMAP._clonedMark = GMAP.createMarker(location, true);
                }
            }

            GMAP._infoWindow.setContent(html)
            GMAP._infoWindow.open(GMAP._map, marker);

            // when switching categories and limit display is enabled along with
            // clustering then sometimes the marker and window don't show
            // so we set a timeout to allow it to initlize and then show it
            if (isSwitchingCategory && _opts.markersLimitDisplay && _opts.allowClustering && typeof (MarkerClusterer) != "undefined")
            {
                setTimeout(function ()
                {
                    GMAP._infoWindow.open(GMAP._map, marker);

                    GMAP.resetClonedMark();

                    if (marker.getMap() == null)
                    {
                        GMAP._clonedMark = GMAP.createMarker(location, true);
                    }
                }, 100);
            }

            if (_opts.bubbleCenter)
            {
                GMAP._map.setCenter(marker.getPosition());
            }

            if (_opts.markersLimitDisplay)
            {
                GMAP.toggleMarker(location, true);
            }
        },
        closeBubble: function ()
        {
            GMAP._infoWindow.close();
            GMAP.resetClonedMark();
        },
        toggleMarker: function (location, visible)
        {
            var mark = location.getProperty("mapit-marker");
            if (mark)
            {
                mark.setVisible(visible);
            }
        },
        toggleMarkers: function (oldCategory, newCategory)
        {
            if (GMAP._lastLocation != null)
            {
                GMAP.toggleMarker(GMAP._lastLocation, false);
            }

            if (_searchLocations.length > 0)
            {
                jQuery.each(_searchLocations, function (locIndex, loc)
                {
                    GMAP.toggleMarker(loc, false);
                });
            }

            if (oldCategory != null)
            {
                var locations = oldCategory.get_locations();

                jQuery.each(locations, function (locIndex, loc)
                {
                    GMAP.toggleMarker(loc, false);
                });
            }

            if (newCategory != null)
            {
                var locations = newCategory.get_locations();

                jQuery.each(locations, function (locIndex, loc)
                {
                    GMAP.toggleMarker(loc, true);
                });

                GMAP.applyClustering();
            }
        },
        zoomIn: function (catOrLoc)
        {
            // get the location zoom
            var zoom = catOrLoc.get_zoomLevel();

            if (zoom != null)
            {
                var currentZoom = GMAP._map.getZoom();
                if (currentZoom != zoom)
                {
                    GMAP._map.setZoom(zoom);
                }
            }
        },
        resetClonedMark: function ()
        {
            if (_opts.allowClustering && GMAP._clonedMark != null)
            {
                GMAP._clonedMark.setMap(null);
                GMAP._clonedMark = null;
            }
        },
        applyClustering: function ()
        {
            if (_opts.allowClustering && typeof (MarkerClusterer) != "undefined")
            {
                var visibleMarks = GMAP._marks;

                if (_opts.markersLimitDisplay)
                {
                    visibleMarks = [];

                    for (var i = 0; i < GMAP._marks.length; i++)
                    {
                        if (GMAP._marks[i].getVisible() == true)
                        {
                            visibleMarks.push(GMAP._marks[i]);
                        }
                    }
                }

                if (_markerClusters != null)
                {
                    _markerClusters.clearMarkers();
                }

                _markerClusters = new MarkerClusterer(GMAP._map, visibleMarks, _opts.markerClustererOptions);
            }
        }
        //#endregion
    };
    //#endregion
};

//#region Entities
mapit.category = function ()
{
    'use strict';

    //#region Private Fields
    var getPropertyFunc;
    var setPropertyFunc;
    //#endregion

    //#region Public Properties
    this.get_id = function ()
    {
        return this.getProperty("id");
    };
    this.set_id = function (val)
    {
        this.setProperty("id", val);
    };
    this.get_bubbleTemplateId = function ()
    {
        return this.getProperty("bubble-templateid");
    };
    this.set_bubbleTemplateId = function (val)
    {
        this.setProperty("bubble-templateid", val);
    };
    this.get_detailTemplateId = function ()
    {
        return this.getProperty("details-templateid");
    };
    this.set_detailTemplateId = function (val)
    {
        this.setProperty("details-templateid", val);
    };
    this.get_name = function ()
    {
        return this.getProperty("name");
    };
    this.set_name = function (val)
    {
        this.setProperty("name", val);
    };
    this.get_isDefault = function ()
    {
        return this.getProperty("isdefault");
    };
    this.set_isDefault = function (val)
    {
        this.setProperty("isdefault", val);
    };
    this.get_icon = function ()
    {
        return this.getProperty("icon");
    };
    this.set_icon = function (val)
    {
        this.setProperty("icon", val);
    };
    this.get_locations = function ()
    {
        return this.getProperty("locations");
    };
    this.set_locations = function (val)
    {
        this.setProperty("locations", val);
    }
    this.get_zoomLevel = function ()
    {
        return mapit.utils.parseInt(this.getProperty("zoomlevel"), null);
    };
    this.set_zoomLevel = function (val)
    {
        this.setProperty("zoomlevel", val);
    };
    this.set_getProperty = function (func)
    {
        getPropertyFunc = func;
    }
    this.set_setProperty = function (func)
    {
        setPropertyFunc = func;
    }
    //#endregion

    //#region Public Methods
    this.getProperty = function (propName)
    {
        var propVal;

        if (getPropertyFunc)
        {
            propVal = getPropertyFunc(this, propName);
        }
        else
        {
            propVal = this[propName];
        }

        return propVal;
    };
    this.setProperty = function (propName, val)
    {
        var propVal;

        if (setPropertyFunc)
        {
            setPropertyFunc(this, propName, val);
        }
        else
        {
            this[propName] = val;
        }

        return propVal;
    };
    //#endregion
};
mapit.location = function ()
{
    'use strict';

    //#region Private Fields
    var getPropertyFunc;
    var setPropertyFunc;
    //#endregion

    //#region Public Properties
    this.get_id = function ()
    {
        return this.getProperty("id");
    };
    this.set_id = function (val)
    {
        this.setProperty("id", val);
    };
    this.get_catId = function ()
    {
        return this.getProperty("catid");
    };
    this.set_catId = function (val)
    {
        this.setProperty("catid", val);
    };
    this.get_bubbleTemplateId = function ()
    {
        return this.getProperty("bubble-templateid");
    };
    this.set_bubbleTemplateId = function (val)
    {
        this.setProperty("bubble-templateid", val);
    };
    this.get_detailTemplateId = function ()
    {
        return this.getProperty("details-templateid");
    };
    this.set_detailTemplateId = function (val)
    {
        this.setProperty("details-templateid", val);
    };
    this.get_name = function ()
    {
        return this.getProperty("name");
    };
    this.set_name = function (val)
    {
        this.setProperty("name", val);
    };
    this.get_isDefault = function ()
    {
        return this.getProperty("isdefault");
    };
    this.set_isDefault = function (val)
    {
        this.setProperty("isdefault", val);
    };
    this.get_address = function ()
    {
        return this.getProperty("address");
    };
    this.set_address = function (val)
    {
        this.setProperty("address", val);
    };
    this.get_city = function ()
    {
        return this.getProperty("city");
    };
    this.set_city = function (val)
    {
        this.setProperty("city", val);
    };
    this.get_state = function ()
    {
        return this.getProperty("state");
    };
    this.set_state = function (val)
    {
        this.setProperty("state", val);
    };
    this.get_zip = function ()
    {
        return this.getProperty("zip");
    };
    this.set_zip = function (val)
    {
        this.setProperty("zip", val);
    };
    this.get_cords = function ()
    {
        return this.getProperty("cords");
    };
    this.set_cords = function (val)
    {
        this.setProperty("cords", val);
    };
    this.get_icon = function ()
    {
        return this.getProperty("icon");
    };
    this.set_icon = function (val)
    {
        this.setProperty("icon", val);
    };
    this.get_info = function ()
    {
        return this.getProperty("info");
    };
    this.set_info = function (val)
    {
        this.setProperty("info", val);
    };
    this.get_showDirectionsLink = function ()
    {
        return mapit.utils.parseBool(this.getProperty("showdirectionslink"), true);
    };
    this.set_showDirectionsLink = function (val)
    {
        this.setProperty("showdirectionslink", val);
    };
    this.get_links = function ()
    {
        return this.getProperty("links");
    };
    this.set_links = function (val)
    {
        this.setProperty("links", val);
    }
    this.get_zoomLevel = function ()
    {
        return mapit.utils.parseInt(this.getProperty("zoomlevel"), null);
    };
    this.set_zoomLevel = function (val)
    {
        this.setProperty("zoomlevel", val);
    };
    this.set_getProperty = function (func)
    {
        getPropertyFunc = func;
    }
    this.set_setProperty = function (func)
    {
        setPropertyFunc = func;
    }
    //#endregion

    //#region Public Methods
    this.getProperty = function (propName)
    {
        var propVal;

        if (getPropertyFunc)
        {
            propVal = getPropertyFunc(this, propName);
        }
        else
        {
            propVal = this[propName];
        }

        return propVal;
    };
    this.setProperty = function (propName, val)
    {
        var propVal;

        if (setPropertyFunc)
        {
            setPropertyFunc(this, propName, val);
        }
        else
        {
            this[propName] = val;
        }

        return propVal;
    };
    //#endregion
};
mapit.link = function ()
{
    'use strict';

    //#region Private Fields
    var getPropertyFunc;
    var setPropertyFunc;
    //#endregion

    //#region Public Properties
    this.get_id = function ()
    {
        return this.getProperty("id");
    };
    this.set_id = function (val)
    {
        this.setProperty("id", val);
    };
    this.get_locationId = function ()
    {
        return this.getProperty("locationid");
    };
    this.set_locationId = function (val)
    {
        this.setProperty("locationid", val);
    };
    this.get_name = function ()
    {
        return this.getProperty("name");
    };
    this.set_name = function (val)
    {
        this.setProperty("name", val);
    };
    this.get_url = function ()
    {
        return this.getProperty("url");
    };
    this.set_url = function (val)
    {
        this.setProperty("url", val);
    };
    this.get_target = function ()
    {
        return (this.getProperty("target") || "_blank");
    };
    this.set_target = function (val)
    {
        this.setProperty("target", val);
    };
    this.get_cssClass = function ()
    {
        return this.getProperty("cssclass");
    };
    this.set_cssClass = function (val)
    {
        this.setProperty("cssclass", val);
    };
    this.set_getProperty = function (func)
    {
        getPropertyFunc = func;
    }
    this.set_setProperty = function (func)
    {
        setPropertyFunc = func;
    }
    //#endregion

    //#region Public Methods
    this.getProperty = function (propName)
    {
        var propVal;

        if (getPropertyFunc)
        {
            propVal = getPropertyFunc(this, propName);
        }
        else
        {
            propVal = this[propName];
        }

        return propVal;
    };
    this.setProperty = function (propName, val)
    {
        var propVal;

        if (setPropertyFunc)
        {
            setPropertyFunc(this, propName, val);
        }
        else
        {
            this[propName] = val;
        }

        return propVal;
    };
    //#endregion
};
mapit.template = function ()
{
    'use strict';

    //#region Private Fields
    var getPropertyFunc;
    var setPropertyFunc;
    //#endregion

    //#region Public Properties
    this.get_id = function ()
    {
        return this.getProperty("id");
    };
    this.set_id = function (val)
    {
        this.setProperty("id", val);
    };
    this.get_tabs = function ()
    {
        return this.getProperty("tabs");
    };
    this.set_tabs = function (val)
    {
        this.setProperty("tabs", val);
    }
    this.get_html = function ()
    {
        return this.getProperty("html");
    };
    this.set_html = function (val)
    {
        this.setProperty("html", val);
    };
    this.set_getProperty = function (func)
    {
        getPropertyFunc = func;
    }
    this.set_setProperty = function (func)
    {
        setPropertyFunc = func;
    }
    //#endregion

    //#region Public Methods
    this.getProperty = function (propName)
    {
        var propVal;

        if (getPropertyFunc)
        {
            propVal = getPropertyFunc(this, propName);
        }
        else
        {
            propVal = this[propName];
        }

        return propVal;
    };
    this.setProperty = function (propName, val)
    {
        var propVal;

        if (setPropertyFunc)
        {
            setPropertyFunc(this, propName, val);
        }
        else
        {
            this[propName] = val;
        }

        return propVal;
    };
    //#endregion
};
mapit.templateTab = function ()
{
    'use strict';

    //#region Private Fields
    var getPropertyFunc;
    var setPropertyFunc;
    //#endregion

    //#region Public Properties
    this.get_name = function ()
    {
        return this.getProperty("name");
    };
    this.set_name = function (val)
    {
        this.setProperty("name", val);
    };
    this.get_html = function ()
    {
        return this.getProperty("html");
    };
    this.set_html = function (val)
    {
        this.setProperty("html", val);
    };
    this.set_getProperty = function (func)
    {
        getPropertyFunc = func;
    }
    this.set_setProperty = function (func)
    {
        setPropertyFunc = func;
    }
    //#endregion

    //#region Public Methods
    this.getProperty = function (propName)
    {
        var propVal;

        if (getPropertyFunc)
        {
            propVal = getPropertyFunc(this, propName);
        }
        else
        {
            propVal = this[propName];
        }

        return propVal;
    };
    this.setProperty = function (propName, val)
    {
        var propVal;

        if (setPropertyFunc)
        {
            setPropertyFunc(this, propName, val);
        }
        else
        {
            this[propName] = val;
        }

        return propVal;
    };
    //#endregion
};
//#endregion

//#region Data Sources
mapit.xmlDataSource = function (mapitObj, options)
{
    'use strict';

    //#region Private Fields
    var _mapIt = mapitObj;
    var _opts = mapitObj.get_options();
    var _xml;
    var _dataSourceOpts = {
        xmlConfig: "jquery.mapit.xml",
        cacheXml: true,
        templates: null
    };
    _dataSourceOpts = jQuery.extend({}, _dataSourceOpts, options);
    var _templates;
    var _categories;
    //#endregion

    // backwards compatibility support
    if (_opts.xmlConfig != null)
    {
        _dataSourceOpts.xmlConfig = _opts.xmlConfig;
    }
    if (_opts.cacheXml != null)
    {
        _dataSourceOpts.cacheXml = _opts.cacheXml;
    }

    //#region Private Methods
    var _loadXml = function (xml)
    {
        _xml = xml;
        _loadOptionsFromXml(jQuery("map, mapit", xml));
        _loadCategoriesFromXml(_xml);

        return _categories;
    };
    var _loadOptionsFromXml = function (mapNode)
    {
        _opts.title = mapit.utils.parseStr(mapNode.attr("title"), _opts.title);
        _opts.zoomlevel = mapit.utils.parseInt(mapNode.attr("zoomlevel"), _opts.zoomlevel);
        _opts.panx = mapit.utils.parseInt(mapNode.attr("panx"), _opts.panx);
        _opts.pany = mapit.utils.parseInt(mapNode.attr("pany"), _opts.pany);
        _opts.startCoordinates = mapit.utils.parseStr((mapNode.attr("startcoordinates") || mapNode.attr("startcordinates")), _opts.startCoordinates); // backwards compatibility support for incorrect spelling
        _opts.accordionAutoSelect = mapit.utils.parseBool((mapNode.attr("accordion-autoselect") || mapNode.attr("accordionautoselect")), _opts.accordionAutoSelect);
        _opts.accordionShowSubLinks = mapit.utils.parseBool(mapNode.attr("accordion-showsublinks"), _opts.accordionShowSubLinks);
        _opts.bubbleCenter = mapit.utils.parseBool(mapNode.attr("bubble-center"), _opts.bubbleCenter);
        _opts.bubbleShowCoordinates = mapit.utils.parseBool((mapNode.attr("bubble-showcoordinates") || mapNode.attr("showbubblecoordinates")), _opts.bubbleShowCoordinates);
        _opts.bubbleShowAtStart = mapit.utils.parseBool((mapNode.attr("bubble-showatstart")), _opts.bubbleShowAtStart);
        _opts.bubbleShowSubLinks = mapit.utils.parseBool((mapNode.attr("bubble-showsublinks")), _opts.bubbleShowSubLinks);
        _opts.coordinatesInDirections = mapit.utils.parseBool((mapNode.attr("coordinatesindirections") || mapNode.attr("includecoordinatesindirections")), _opts.coordinatesInDirections);

        var mapType = mapNode.attr("maptype");

        if (mapType && mapType.length > 0)
        {
            switch (mapType.toLowerCase())
            {
                case "roadmap": _opts.mapType = google.maps.MapTypeId.ROADMAP; break;
                case "satellite": _opts.mapType = google.maps.MapTypeId.SATELLITE; break;
                case "hybrid": _opts.mapType = google.maps.MapTypeId.HYBRID; break;
                default: _opts.mapType = google.maps.MapTypeId.TERRAIN; break;
            }
        }
        else
        {
            _opts.mapType = google.maps.MapTypeId.TERRAIN;
        }

        var accordionAnimation = mapNode.attr("accordion-animation") || mapNode.attr("accordionanimation");

        if (accordionAnimation && accordionAnimation.length > 0)
        {
            if (accordionAnimation.toLowerCase() == "true" || accordionAnimation.toLowerCase() == "false")
            {
                _opts.accordionAnimation = eval(accordionAnimation) == true;
            }
            else
            {
                _opts.accordionAnimation = accordionAnimation;
            }
        }

        _opts.detailsShow = mapit.utils.parseBool((mapNode.attr("details-show") || mapNode.attr("showdetails")), _opts.detailsShow);
        _opts.detailsShowIcon = mapit.utils.parseBool((mapNode.attr("details-showicon") || mapNode.attr("showdetailsicon")), _opts.detailsShowIcon);
        _opts.detailsShowCoordinates = mapit.utils.parseBool((mapNode.attr("details-showcoordinates") || mapNode.attr("showdetailscoordinates")), _opts.detailsShowCoordinates);
        _opts.navBarLocation = mapit.utils.parseStr(mapNode.attr("navbarlocation"), _opts.navBarLocation);
        _opts.searchShow = mapit.utils.parseBool(mapNode.attr("search-show") || mapNode.attr("showsearch"), _opts.searchShow);
        _opts.searchText = mapit.utils.parseStr(mapNode.attr("search-text") || mapNode.attr("searchtext"), _opts.searchText);
        _opts.markerIcon = mapit.utils.parseStr(mapNode.attr("markericon"), _opts.markerIcon);
        _opts.markersLimitDisplay = mapit.utils.parseBool(mapNode.attr("markers-limitdisplay"), _opts.markersLimitDisplay);

        _mapIt.set_options(_opts);
    };
    var _loadTemplatesFromXml = function ()
    {
        _templates = [];
        var genTemplateId = 0;
        var genTabId = 0;

        // parse the templates
        jQuery(_xml).find('templates').each(function ()
        {
            var $tempsEle = jQuery(this);

            $tempsEle.find('template').each(function ()
            {
                // parse the template
                var $tempEle = jQuery(this);
                var template = new mapit.template();
                _initTemplate(template, $tempEle, genTemplateId);
                var tempId = template.get_id();
                var tabs = [];
                _templates.push(template);
                genTemplateId++;

                // locations
                var tabEles = $tempEle.find('tab');
                if (tabEles.length > 0)
                {
                    tabEles.each(function ()
                    {
                        var $tabEle = jQuery(this);
                        var tab = new mapit.templateTab();
                        _initTab(tab, $tabEle, genTabId);
                        tabs.push(tab);
                        genTabId++;
                    });
                }
                else
                {
                    template.set_html($tempEle.text());
                }

                template.set_tabs(tabs);
            });
        });
    };
    var _loadCategoriesFromXml = function ()
    {
        _categories = [];
        var genLocId = 0;
        var genLinkId = 0;

        // parse the categories
        jQuery(_xml).find('category').each(function (catIndex)
        {
            var $catEle = jQuery(this);
            var cat = new mapit.category();
            _initCategory(cat, $catEle, catIndex);
            var catId = cat.get_id();
            var locations = [];
            _categories.push(cat);

            // locations
            $catEle.find('location').each(function (locIndex)
            {
                var $locEle = jQuery(this);
                var loc = new mapit.location();
                _initLocation(catId, loc, $locEle, genLocId);
                var locId = loc.get_id();
                var links = [];
                locations.push(loc);
                genLocId++;

                // links
                $locEle.find('link').each(function (linkIndex)
                {
                    var $linkEle = jQuery(this);
                    var link = new mapit.link();
                    _initLink(locId, link, $linkEle, genLinkId);
                    links.push(link);
                    genLinkId++;
                });

                loc.set_links(links);
            });

            cat.set_locations(locations);
        });
    };
    var _initCategory = function (category, xmlNode, index)
    {
        category.set_getProperty(_getProperty);
        category.setProperty("xmlNode", xmlNode);
        category.set_id(xmlNode.attr("id") || index);
        category.set_name(xmlNode.attr("name"));
        category.set_icon(xmlNode.attr("icon") || xmlNode.attr("markericon"));
    };
    var _initLocation = function (catId, loc, xmlNode, index)
    {
        loc.set_getProperty(_getProperty);
        loc.setProperty("xmlNode", xmlNode);
        loc.set_id(xmlNode.attr("id") || index);
        loc.set_catId(catId);
        loc.set_state(xmlNode.attr("state") || xmlNode.attr("province"));
        loc.set_zip(xmlNode.attr("zip") || xmlNode.attr("code"));
        loc.set_cords(xmlNode.attr("coordinates") || xmlNode.attr("cordinates"));
        loc.set_icon(xmlNode.attr("icon") || xmlNode.attr("markericon"));

        var infoNode = (xmlNode.find("info") || xmlNode.find("infobar"));
        if (infoNode != null)
        {
            loc.set_info(infoNode.text());
        }
    };
    var _initLink = function (locId, link, xmlNode, index)
    {
        link.set_getProperty(_getProperty);
        link.setProperty("xmlNode", xmlNode);
        link.set_id(xmlNode.attr("id") || index);
        link.set_locationId(locId);
    };
    var _initTemplate = function (template, xmlNode, index)
    {
        template.set_getProperty(_getProperty);
        template.setProperty("xmlNode", xmlNode);
        template.set_id(xmlNode.attr("id") || index);
    };
    var _initTab = function (tab, xmlNode, index)
    {
        tab.set_getProperty(_getProperty);
        tab.setProperty("xmlNode", xmlNode);
        tab.set_html(xmlNode.text());
    };
    var _getProperty = function (entity, propName)
    {
        var propVal = entity[propName];

        if (propVal == null)
        {
            entity[propName] = propVal = (entity["xmlNode"].attr(propName) || entity["xmlNode"].find(propName).text());
        }

        return propVal;
    };
    //#endregion

    //#region Public Methods
    this.getDataAsync = function (onCompleted)
    {
        jQuery.ajax({
            cache: _dataSourceOpts.cacheXml,
            type: "GET",
            url: _dataSourceOpts.xmlConfig,
            dataType: "xml",
            success: function (xml) { onCompleted(_loadXml(xml)); },
            error: function () { alert("Failed to load the xml file."); }
        });
    };
    this.getTemplates = function ()
    {
        if (_dataSourceOpts.templates != null)
        {
            _templates = _dataSourceOpts.templates;
        }
        else
        {
            _loadTemplatesFromXml(_xml);
        }

        return _templates;
    }
    //#endregion
}
mapit.jsonDataSource = function (mapitObj, options)
{
    'use strict';

    //#region Private Fields
    var _mapIt = mapitObj;
    var _opts = mapitObj.get_options();
    var _dataSourceOpts = {
        getGategoriesMethod: null,
        templates: [],
        categories: []
    };
    _dataSourceOpts = jQuery.extend({}, _dataSourceOpts, options);
    var _templates;
    var _categories;
    //#endregion

    //#region Private Methods
    var _loadTemplatesFromJson = function ()
    {
        _templates = [];
        var genTemplateId = 0;
        var genTabId = 0;

        // parse the templates
        if (_dataSourceOpts.templates != null)
        {
            jQuery.each(_dataSourceOpts.templates, function (templateIndex, templateJson)
            {
                // parse the template
                var template = new mapit.template();
                _initTemplate(template, templateJson, genTemplateId);
                var tempId = template.get_id();
                var tabs = [];
                _templates.push(template);
                genTemplateId++;

                // locations
                if (templateJson.tabs != null && templateJson.tabs.length > 0)
                {
                    jQuery.each(templateJson.tabs, function (tabIndex, tabJson)
                    {
                        var tab = new mapit.templateTab();
                        _initTab(tab, tabJson, genTabId);
                        tabs.push(tab);
                        genTabId++;
                    });
                }
                else
                {
                    template.set_html(templateJson.html);
                }

                template.set_tabs(tabs);
            });
        }
    };
    var _loadCategoriesFromJson = function ()
    {
        _categories = [];
        var genLocId = 0;
        var genLinkId = 0;

        // parse the categories
        jQuery.each(_dataSourceOpts.categories, function (catIndex, catJson)
        {
            var cat = new mapit.category();
            _initCategory(cat, catJson, catIndex);
            var catId = cat.get_id();
            var locations = [];
            _categories.push(cat);

            // locations
            if (catJson.locations != null)
            {
                jQuery.each(catJson.locations, function (locIndex, locJson)
                {
                    var loc = new mapit.location();
                    _initLocation(catId, loc, locJson, genLocId);
                    var locId = loc.get_id();
                    var links = [];
                    locations.push(loc);
                    genLocId++;

                    // links
                    if (locJson.links != null)
                    {
                        jQuery.each(locJson.links, function (linkIndex, linkJson)
                        {
                            var $linkEle = jQuery(this);
                            var link = new mapit.link();
                            _initLink(locId, link, $linkEle, genLinkId);
                            links.push(link);
                            genLinkId++;
                        });
                    }

                    loc.set_links(links);
                });
            }

            cat.set_locations(locations);
        });
    };
    var _initCategory = function (category, catJson, index)
    {
        category.set_getProperty(_getProperty);
        category.setProperty("jsonData", catJson);
        category.set_id(catJson.id || index);
        category.set_name(catJson.name);
        category.set_icon(catJson.icon || catJson.markerIcon);
        category.set_bubbleTemplateId(catJson.bubbleTemplateId);
        category.set_detailTemplateId(catJson.detailTemplateId);
    };
    var _initLocation = function (catId, loc, locJson, index)
    {
        loc.set_getProperty(_getProperty);
        loc.setProperty("jsonData", locJson);
        loc.set_id(locJson.id || index);
        loc.set_catId(catId);
        loc.set_state(locJson.state || locJson.province);
        loc.set_zip(locJson.zip || locJson.code);
        loc.set_cords(locJson.coordinates);
        loc.set_icon(locJson.icon || locJson.markerIcon);
        loc.set_info(locJson.info || locJson.infoBar);
        loc.set_bubbleTemplateId(locJson.bubbleTemplateId);
        loc.set_detailTemplateId(locJson.detailTemplateId);
    };
    var _initLink = function (locId, link, linkJson, index)
    {
        link.set_getProperty(_getProperty);
        link.setProperty("jsonData", linkJson);
        link.set_id(linkJson.id || index);
        link.set_locationId(locId);
    };
    var _initTemplate = function (template, templateJson, index)
    {
        template.set_getProperty(_getProperty);
        template.setProperty("jsonData", templateJson);
        template.set_id(templateJson.id || index);
    };
    var _initTab = function (tab, tabJson, index)
    {
        tab.set_getProperty(_getProperty);
        tab.setProperty("jsonData", tabJson);
        tab.set_html(tabJson.html);
    };
    var _getProperty = function (entity, propName)
    {
        var propVal = entity[propName];

        if (propVal == null)
        {
            entity[propName] = propVal = (entity["jsonData"][propName]);
        }

        return propVal;
    };
    //#endregion

    //#region Public Methods
    this.getDataAsync = function (onCompleted)
    {
        if (typeof (_dataSourceOpts.getGategoriesMethod) == "function")
        {
            var asyncCompleted = function (categoriesJson)
            {
                _dataSourceOpts.categories = categoriesJson;
                _loadCategoriesFromJson();
                onCompleted(_categories);
            };

            _dataSourceOpts.getGategoriesMethod(asyncCompleted);
        }
        else
        {
            _loadCategoriesFromJson();
            onCompleted(_categories);
        }
    };
    this.getTemplates = function ()
    {
        _loadTemplatesFromJson();

        return _templates;
    }
    //#endregion
}
//#endregion

//#region Utils
mapit.utils = {
    parseBool: function (val, defaultVal)
    {
        var newVal = defaultVal;

        if (val && val.length > 0)
        {
            newVal = (val.toLowerCase() == "true" ? true : false);
        }

        return newVal;
    },
    parseInt: function (val, defaultVal)
    {
        var newVal = defaultVal;

        if (val && val.length > 0)
        {
            var parsedVal = parseInt(val);
            if (!isNaN(parsedVal))
            {
                newVal = parsedVal;
            }
        }

        return newVal;
    },
    parseStr: function (val, defaultVal)
    {
        var newVal = defaultVal;

        if (val && val.length > 0)
        {
            newVal = val;
        }

        return newVal;
    },
    isArray: function (obj)
    {
        return obj.constructor == Array;
    },
    escapeHTML: function (str)
    {
        var div = document.createElement('div');
        var text = document.createTextNode(str);
        div.appendChild(text);
        return div.innerHTML;
    },
    qs: function (name)
    {
        var match = RegExp('[?&]' + name + '=([^&]*)', "i")
                        .exec(window.location.search);

        return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    },
    getBrowserType: function ()
    {
        var browserName = "unknown";

        if (jQuery.browser.webkit)
        {
            browserName = "webkit";
        }
        else if (jQuery.browser.opera)
        {
            browserName = "opera";
        }
        else if (jQuery.browser.msie)
        {
            browserName = "ie";
        }
        else if (jQuery.browser.mozilla)
        {
            browserName = "mozilla";
        }

        return "mapit-browser-" + browserName;
    },
    getBrowserSubType: function ()
    {
        var browserName = "unknown";

        if (jQuery.browser.webkit)
        {
            browserName = "webkit";

            if (navigator.userAgent.match(/iPad/i))
            {
                browserName = "webkit-ipad";
            }
            else if (navigator.userAgent.match(/iPod/i))
            {
                browserName = "webkit-ipod";
            }
            else if (navigator.userAgent.match(/iPhone/i))
            {
                browserName = "webkit-iphone";
            }
        }
        else if (jQuery.browser.opera)
        {
            browserName = "opera";
        }
        else if (jQuery.browser.msie)
        {
            browserName = "ie" + jQuery.browser.version.split(".", 1)[0];
        }
        else if (jQuery.browser.mozilla)
        {
            browserName = "mozilla";

            if (navigator.userAgent.match(/Firefox/i))
            {
                var version = mapit.utils.parseInt(jQuery.browser.version.split(".", 1)[0], 0);

                if (version >= 4)
                {
                    browserName = "mozilla-firefox mapit-browser-mozilla-firefox4plus";
                }
                else
                {
                    browserName = "mozilla-firefox mapit-browser-mozilla-firefox" + version;
                }

            }
            else if (navigator.userAgent.match(/Opera/i))
            {
                browserName = "mozilla-opera";
            }
        }

        return "mapit-browser-" + browserName;
    }
};
//#endregion

mapit.globals = {
    lastId: 0,
    accordionIds: []
};

(function (jQuery)
{
    jQuery.fn.mapit = function (action, options)
    {
        'use strict';

        // iterate and reformat each matched element
        return this.each(function ()
        {
            action = (action || {});
            options = (options || {});

            if (typeof (action) == 'object')
            {
                options = action;
                action = 'initialize';
            }

            switch (action.toLowerCase())
            {
                case "initialize":
                default:
                    var $this = jQuery(this);
                    this.mapit = new mapit(options);
                    this.mapit.init($this);
                    break;
            }
        });
    };

})(jQuery);