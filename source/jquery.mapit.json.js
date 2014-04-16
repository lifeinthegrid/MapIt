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