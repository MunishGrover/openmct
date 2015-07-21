/*****************************************************************************
 * Open MCT Web, Copyright (c) 2014-2015, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT Web is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT Web includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/
/*global define*/

/**
 * Module defining SearchAggregator. Created by shale on 07/16/2015.
 */
define(
    [],
    function () {
        "use strict";

        var DEFUALT_TIMEOUT =  1000,
            DEFAULT_MAX_RESULTS = 100;
        
        /**
         * Allows multiple services which provide search functionality 
         * to be treated as one.
         *
         * @constructor
         * @param {SearchProvider[]} providers the search providers to be
         *        aggregated
         */
        function SearchAggregator(providers) {
            
            // Remove extra objects that have the same ID 
            function filterRepeats(results) {
                var ids = [],
                    idToIndicies = {}, // 'dictionary' mapping IDs to a list of indicies 
                    filteredResults = [];
                
                // Create a list of indicies of objects that correspond to any object ID
                for (var i = 0; i < results.length; i++) {
                    var id = results[i].id;
                    
                    if (idToIndicies[id]) {
                        // If the ID already exists in the dictionary, push this index to 
                        // the end of the array it points to
                        idToIndicies[id].push(i);
                    } else {
                        // Else make a new entry in the dictionary with this ID, pointing 
                        // to this index
                        idToIndicies[id] = [i];
                        // And also add this ID to the list of IDs that we have seen
                        ids.push(id);
                    }
                }
                
                // Now for each ID in the dictionary, we want to use the version of  
                // the object that has a higher score
                for (var i = 0; i < ids.length; i++) {
                    var id = ids[i],
                        indicies = idToIndicies[id],
                        highestScoringObject;
                    
                    highestScoringObject = results[ indicies[0] ];
                    for (var j = 0; j < indicies.length; j++) {
                        // If the score of the object corresponding to this index of the results 
                        // list has a higher score than the one we have, choose it instead
                        if (results[indicies[j]].score > highestScoringObject.score) {
                            highestScoringObject = results[indicies[j]];
                        }
                    }
                    filteredResults.push(highestScoringObject);
                }

                return filteredResults;
                /*
                var ids = [];
                
                for (var i = 0; i < results.length; i += 1) {
                    if (ids.indexOf(results[i].id) !== -1) {
                        // If this result's ID is already there, remove the object
                        results.splice(i, 1);
                        // Reduce loop index because we shortened the array 
                        i -= 1;
                    } else {
                        // Otherwise add the ID to the list of the ones we have seen 
                        ids.push(results[i].id);
                    }
                }
                
                return results;
                */
            }
            
            // Order the objects from highest to lowest score in the array
            function orderByScore(results) {
                
                results = results.sort(function (a, b) {
                    if (a.score > b.score) {
                        return -1;
                    } else if (b.score > a.score) {
                        return 1;
                    } else {
                        return 0;
                    }
                });
                
                /*
                for (var i = 0; i < results.length; i++) {
                    console.log('score', results[i].score, 'for', results[i].object.getModel().name);
                }
                */
                
                return results;
            }
            
            // 'Loop' over the promises using recursion so that the promises are fufilled by the
            // time that we are done
            function getPromisedResults(resultsPromises, promiseIndex, finalResults) {
                if (promiseIndex >= resultsPromises.length) {
                    return finalResults;
                } else {
                    return resultsPromises[promiseIndex].then(function (results) {
                        finalResults = finalResults.concat(results);
                        return getPromisedResults(resultsPromises, promiseIndex + 1, finalResults);
                    });
                }
            }
            
            // Recieves results in the format of a serachResult object. It 
            // has the members id, object, and score. It has a function 
            // next() which returns the next highest score search result 
            // for that search. 
            
            // Calls the searches of each of the providers, then 
            // merges the results lists so that there are not redundant 
            // results 
            function mergeResults(inputID) {
                var resultsPromises = [];
                
                // Get result list promises
                for (var i = 0; i < providers.length; i += 1) {
                    resultsPromises.push(
                        providers[i].query(
                            inputID, DEFAULT_MAX_RESULTS, DEFUALT_TIMEOUT
                        )
                    );
                }
                
                // Wait for the promises to fufill
                return getPromisedResults(resultsPromises, 0, []).then(function (c) {
                    // Get rid of the repeated objects and put in correct order
                    c = filterRepeats(c);
                    c = orderByScore(c);
                    return c;
                });
            }
            
            return {
                query: mergeResults
            };
        }

        return SearchAggregator;
    }
);