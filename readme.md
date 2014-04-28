#[MapIt 2.0](http://lifeinthegrid.com/mapit)
##Maps Made Your Way!

MapIt is 100% Free jQuery plug-in that interacts with the Google Maps API. MapIt groups and organize all your locations into an easy to use interface. 
All the heavy lifting is done so you don't have to learn the Google API. Just edit the XML configuration file and your ready to share your locations.  

**Start Here:** [http://lifeinthegrid.com/mapit](http://lifeinthegrid.com/mapit)  
**Demos Here:** [http://lifeinthegrid.github.io/demos/mapit](http://lifeinthegrid.github.io/demos/mapit)

##License
- The Duplicator is licensed under the GPLv2 or later:
  - http://www.gnu.org/licenses/gpl-2.0.html
- Attribution is required for MapIt, and very much appreciated:
  - Please use: `MapIt - http://lifeinthegrid.com/mapit`

##Usage

- This plugin will only work from an  "http(s)://" path.  Do **not** try "file:///" 
- The demos make references to Google's CDN network which requires internet access
- To see the plugin extract the zip file to your web server then browse to index.html

1. The easiest way to get started is to copy existing demos source code and then modify.
2. Move the source code to the location on your web server.
3. Check that all paths map correctly to the locations of where you moved each file (scripts, links, code).
4. Do not set "cacheXml" to true until you go live.  If dynamically generating the XML file then set "cacheXml" to false.


##Versioning

MapIt is maintained under the Semantic Versioning as much as possible. Releases will be numbered with the following format:

`<major>.<minor>.<patch>`

And constructed with the following guidelines:

* Breaking backward compatibility bumps the major (and resets the minor and patch)
* New additions, including new features, without breaking backward compatibility bumps the minor (and resets the patch)
* Bug fixes and misc changes and small features bumps the patch

##Author
- Twitter: http://twitter.com/lifeinthegrid
- GitHub: https://github.com/lifeinthegrid
- By: Ryan Heideman, Cory Lamle

