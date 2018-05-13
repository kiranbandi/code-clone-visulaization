import * as d3 from 'd3';
import { symbol, symbolCircle, symbolSquare, symbolTriangle, symbolStar } from "d3-shape";
import _ from 'lodash';
import { blueColor, redColor, greenColor, grayColor, purpleColor } from './colors';
import changeLegends from './changeLegends';

// This code was initally written for multiple genealogies 
// but is being used only for a single genealogy at a time 

export default function(cloneData, linkGenealogy) {

    let { genealogy, versionCount, uniqueVersionList } = cloneData,
    paddingHeightPerGroup = 10,
        height = (genealogy.length * paddingHeightPerGroup),
        squareRange = document.body.clientWidth,
        width = squareRange - (squareRange / 10);

    let mainContainer = d3.select('.mainContainer');

    // for projects with more than 10 versions double the clone map width
    width = versionCount > 20 ? width * 1.25 : width;

    if (mainContainer.node()) {
        mainContainer.attr('class', 'mainContainer')
            .style("width", width + 'px')
            .selectAll('*').remove();
    } else {
        mainContainer = d3.select('#root').append('div')
        mainContainer.attr('class', 'mainContainer')
            .style("width", width + 'px');
    }

    mainContainer.append('h3').attr('class', 'SubHeadingTitle plotTitle historyTitle').text('Genealogy Change History');

    //  intial information regarding that particular genealogy
    let subHeadingContainer = mainContainer.append('div').attr('class', 'cloneInfoContainer');
    _.map(genealogy[0].info.split('\n'), (infoValue) => {
        subHeadingContainer.append('p').attr('class', 'infoParagraph').text(infoValue);
    });

    changeLegends('.mainContainer');

    let versionNameContainer = mainContainer.append('div')
        .attr('class', 'versionNameContainer')
        .selectAll('h2')
        .data(uniqueVersionList)
        .enter()
        .append('h2')
        .style("width", width / versionCount + 'px')
        .text((d) => {
            let folderNameSplit = d.split('-');
            // filter out only the version number from the name to save space on the UI
            return _.find(folderNameSplit, function(element) { return /\d/.test(element) });
        })
        .style('font-size', (d) => ((width / versionCount) * 0.15 > 20 ? 20 : (width / versionCount) * 0.15) + 'px');

    let contentContainer = mainContainer.append('svg')
        .attr('class', 'contentContainer')
        .attr('height', '50px')
        .attr('width', width);

    let genealogySetGroup = contentContainer.selectAll('g')
        .data(genealogy)
        .enter()
        .append('g')
        .attr('transform', (d, i) => "translate(0," + paddingHeightPerGroup * i + "10" + ")");

    genealogySetGroup.selectAll('.changeLine').data((d) => d.set)
        .enter()
        .append('line')
        .style('stroke', (d, i) => {
            return d.changeType.indexOf('no_change') > -1 ?
                greenColor : d.changeType.indexOf('inconsistent_change') > -1 ? redColor : blueColor;
        })
        .style('stroke-dasharray', (d, i) => d.changeType.indexOf('deleted') > -1 ? '10' : '0')
        .attr("class", 'changeLine')
        .attr('x1', 0)
        .attr('y1', (d) => d.changeType.indexOf('added') > -1 ? '-4' : '0')
        .attr('x1', width / versionCount)
        .attr('y2', (d) => d.changeType.indexOf('added') > -1 ? '-4' : '0')
        .attr("transform", function(d, i) {
            return "translate(" + (((width / versionCount) * _.indexOf(uniqueVersionList, d.source.version)) + (width / (versionCount * 2))) + "," + paddingHeightPerGroup + ")";
        })

    // To Get the second line we simply redo the same line code except the stroke dash is offset to be invisible and the y cordinates are shifted
    // This is a Temporary Workaround 
    genealogySetGroup.selectAll('.changeLineDouble').data((d) => d.set)
        .enter()
        .append('line')
        .style('stroke', (d, i) => {
            return d.changeType.indexOf('no_change') > -1 ?
                greenColor : d.changeType.indexOf('inconsistent_change') > -1 ? redColor : blueColor;
        }).attr("class", 'changeLineDouble')
        .attr('x1', 0)
        .attr('y1', 4)
        .attr('x1', width / versionCount)
        .attr('y2', 4)
        .attr("transform", function(d, i) {
            return "translate(" + (((width / versionCount) * _.indexOf(uniqueVersionList, d.source.version)) + (width / (versionCount * 2))) + "," + paddingHeightPerGroup + ")";
        })
        .style('stroke-dasharray', (d, i) => d.changeType.indexOf('added') > -1 ? '0' : ('0' + "," + width / versionCount))

    // Since the clone marker and the cloneMarker Text are different elements we attach the same click function to both elements
    //  probably should be modified later on with a more elegant solution
    genealogySetGroup.selectAll('.cloneMarker').data((d) => d.serialList)
        .enter()
        .append('path')
        .attr("class", (d, i) => (d.cloneType.length > 1) ? 'cloneMarker' : 'cloneMarker hiddenMarker')
        .attr("d", symbol().size(375).type((d, i) => symbolCircle))
        .style("fill", (d, i) => (d.cloneType.length > 1) ? grayColor : 'white')
        .attr("transform", function(d, i) {
            return "translate(" + (((width / versionCount) * i) + (width / (versionCount * 2))) + "," + paddingHeightPerGroup + ")";
        })
        .on("click", markerClicked.bind({ genealogy, linkGenealogy, mainContainer }));

    genealogySetGroup.selectAll('.cloneMarkerText').data((d) => d.serialList)
        .enter()
        .append('text')
        .attr("class", 'cloneMarkerText ')
        .text((d) => {
            return d.cloneType.length > 1 ? d.cloneType.split("-")[1] : '';
        })
        .attr("transform", function(d, i) {
            return "translate(" + (((width / versionCount) * i) + (width / (versionCount * 2)) - 4) + "," + (paddingHeightPerGroup + 5) + ")";
        })
        .on("click", markerClicked.bind({ genealogy, linkGenealogy, mainContainer }));

}

function markerClicked(data, index) {

    let { genealogy, linkGenealogy, mainContainer } = this,
    changeList = genealogy[0].set;

    //reset previously selected marker and highlight the current
    d3.select('.selectedMaker').style('fill', grayColor)
        .classed('selectedMaker', false)
        .attr("d", symbol().size(375).type((d, i) => symbolCircle));
    d3.selectAll('.cloneMarker').filter(function(d, i) { return i === index; })
        .style('fill', purpleColor)
        .attr("d", symbol().size(675).type((d, i) => symbolCircle))
        .classed('selectedMaker', true);


    let sourceChangeNode = _.find(changeList, function(o) { return o.source.version == data.version; }),
        targetChangeNode = _.find(changeList, function(o) { return o.target.version == data.version; });


    let changeDescriptionContainer = d3.select('.changeDescriptionContainer');
    // clear container if it already exists
    if (changeDescriptionContainer.node()) {
        changeDescriptionContainer.selectAll('*').remove();
    } else {
        changeDescriptionContainer = mainContainer.append('div').attr('class', 'changeDescriptionContainer');
    }

    if (targetChangeNode) {
        changeMap(changeDescriptionContainer, targetChangeNode, linkGenealogy, 'Previous Change');
    }
    if (sourceChangeNode) {
        changeMap(changeDescriptionContainer, sourceChangeNode, linkGenealogy, 'Following Change');
    }

}


// Change visualisation for each individual genealogy for a given source or target version
function changeMap(d3container, dataNode, linkGenealogy, headerContent) {

    let changeSubContainer = d3container.append('div').attr('class', 'changeSubContainer');

    changeSubContainer.append('h3')
        .attr('class', 'descriptionContainerHeader SubHeadingTitle plotTitle')
        .text("Change Description for " + headerContent);

    changeSubContainer.append('h3')
        .attr('class', 'descriptionContainerHeader SubHeadingTitle plotTitle')
        .text(sanitizeChangeType(dataNode.changeType));

    let sourceCloneContainer = changeSubContainer.append('div')
        .attr('class', 'sourceCloneContainer cloneDescriptionContainer'),
        targetCloneContainer = changeSubContainer.append('div')
        .attr('class', 'targetCloneContainer cloneDescriptionContainer');


    sourceCloneContainer.append('h3').attr('class', 'descriptionHeader').text('source');
    targetCloneContainer.append('h3').attr('class', 'descriptionHeader').text('target');
    sourceCloneContainer.append('p').text('Version : ' + dataNode.source.version);
    sourceCloneContainer.append('p').text('Clone Type : ' + dataNode.source.cloneType);
    sourceCloneContainer.append('p').text('Class ID : ' + dataNode.source.classId);
    targetCloneContainer.append('p').text('Version : ' + dataNode.target.version);
    targetCloneContainer.append('p').text('Clone Type : ' + dataNode.target.cloneType);
    targetCloneContainer.append('p').text('Clone Class ID : ' + dataNode.target.classId);

    let sourceGenealogyKey = dataNode.source.version + '@' + dataNode.source.classId,
        targetGenealogyKey = dataNode.target.version + '@' + dataNode.target.classId,
        { genealogyMapSource, genealogyMapTarget } = linkGenealogy,
        genealogyInfo = genealogyMapSource[sourceGenealogyKey] || genealogyMapTarget[targetGenealogyKey] || false;


    if (genealogyInfo) {
        changeSubContainer.append('h3')
            .attr('class', 'SubHeadingTitle plotTitle historyTitle')
            .text('Detailed Description');
        // .text('Detailed Description ' + ", Genealogy ID : " + genealogyInfo._attributes.gid);

    } else {
        changeSubContainer.append('h3')
            .attr('class', 'SubHeadingTitle plotTitle historyTitle').text('Detailed Data for ' + headerContent + ' not available');
        return;
    }

    let detailedContainer = changeSubContainer.append('div').attr('class', 'detailedContainer');

    let sourcedetailedContainer = detailedContainer.append('div')
        .attr('class', 'cloneDescriptionContainer'),
        targetdetailedContainer = detailedContainer.append('div')
        .attr('class', 'cloneDescriptionContainer');

    if (genealogyInfo.multiClass) {

        sourcedetailedContainer.append('p').text('Number of Lines : ' + genealogyInfo.class[0]._attributes.nlines);
        sourcedetailedContainer.append('p').text('Number of Fragments : ' + genealogyInfo.class[0]._attributes.nfragments);
        sourcedetailedContainer.append('h3').attr('class', 'descriptionHeader').text('Source Fragments');
        _.each(genealogyInfo.class[0].source, (sourceValue) => {
            let fragment = sourcedetailedContainer.append('div').attr('class', 'fragmentContainer');
            fragment.append('p').text('File : ' + sourceValue._attributes.file + " , " + 'Start Line Number : ' + sourceValue._attributes.startline + "," + ' End Line Number : ' + sourceValue._attributes.endline);
        });

        targetdetailedContainer.append('p').text('Number of Lines : ' + genealogyInfo.class[1]._attributes.nlines);
        targetdetailedContainer.append('p').text('Number of Fragments : ' + genealogyInfo.class[1]._attributes.nfragments);
        targetdetailedContainer.append('h3').attr('class', 'descriptionHeader').text(' Target Fragments');
        _.each(genealogyInfo.class[1].source, (targetValue) => {
            let fragment = targetdetailedContainer.append('div').attr('class', 'fragmentContainer');
            fragment.append('p').text('File : ' + targetValue._attributes.file + " , " + 'Start Line Number : ' + targetValue._attributes.startline + "," + ' End Line Number : ' + targetValue._attributes.endline);
        });

    }

}

function sanitizeChangeType(changeInfo) {
    let change = changeInfo.split(" "),
        changeType = change[0].split("_").join(" "),
        fragmentChange = change[1].split("_").join(" ");
    return "Change Type : " + changeType + " , Clone Fragments Change : " + fragmentChange;
}