/* This file is NOT required for MapIt.  
However in order to run the demos is IS required */

//ENABLE PRO || WEB 
var MODE = "PRO";
var DETAILS;

switch (MODE) {
	case "PRO" :
		DETAILS	= "<span id='mapit-proversion'>Version 2.0</span><br/>";
	break;
	case "WEB" :
		DETAILS	    = "<span id='mapit-webversion'>Web Version</span><br/>";
	break;	
}

jQuery(document).ready(function ()
{
	function compression() 
	{
		var trigger1 = false;
		$('head script').each(function() 
		{
			if (this.src.toLowerCase().indexOf("jquery.mapit.min.js") != -1)
			{
				trigger1 = true;
			}
		});
		
		return (trigger1);
	}
	

	if (typeof(mapit) != 'undefined') 
	{
		if (typeof(mapit.pro) == "function" && MODE == "LITE") 
		{
			mapit.pro   = null;
		}
	}	
	
	//Show Active Version in UI
	DETAILS += (compression()) 
		? "<span class='mapit-compression'>compression: on</span>"
		: "<span class='mapit-compression'>compression: off</span>";

	$('#mapit-version-mode').html(DETAILS);


	//Common Lightbox
	$("a.mapit-show-lightbox").click(function ()
	{
	    var shadow = $("<div id='mapit-lightbox-shadow' />")
	    var panel = $("#mapit-lightbox-panel");

	    shadow.width($(document).width());
	    shadow.height($(document).height());
	    $("body").prepend(shadow).fadeIn(500);

	    panel.css("top", (($(window).height() - panel.outerHeight()) / 2) + $(window).scrollTop() + "px");
	    panel.css("left", (($(window).width() - panel.outerWidth()) / 2) + $(window).scrollLeft() + "px");
	    panel.fadeIn(900);
	})
	$("a.mapit-close-lightbox").click(function ()
	{
	    $("#mapit-lightbox-shadow, #mapit-lightbox-panel").fadeOut(400);
	})
	
});
