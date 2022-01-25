import { select, svg } from 'd3';

export default function initGraph(options) {
  const {
    el, width, height, margin, thickness, fontSize
  } = getConfig(options);

  el.querySelector('svg') && el.querySelector('svg').remove();
  const svg = select(el).append('svg')
    .attr('width', width).attr('height', height);

  let {
    usedPercent,
    distributionPercent,
    title,
    quotaSubKeyText,
    canAssignedText,
    totalText,
    tooltipHtml,
    isProject,
    smallTitleSize,
  } = options
  let tooltip = addTooltip();
  let titleFontSize = fontSize / 1.8

  if (smallTitleSize) {
    titleFontSize = titleFontSize * 0.7
  }
  addArcDistribution(svg, width, margin, thickness, distributionPercent, tooltip, tooltipHtml, options.el, isProject);
  addArcUsage(svg, width, margin, thickness, usedPercent, tooltip, tooltipHtml, options.el, isProject);
  addText(title, svg, width / 2, getTitleLabelY(height, fontSize), titleFontSize, 'title');
  if (quotaSubKeyText) {
    addText(quotaSubKeyText, svg, width / 2, getTotalLabelY(height, fontSize), fontSize / 2.8, 'title');
    addText(totalText, svg, width / 2, getTotalLabelY(height, fontSize) + (0.7 * fontSize), fontSize / 2.2, 'title');
  } else {
    addText(totalText, svg, width / 2, getTotalLabelY(height, fontSize), fontSize / 2.2, 'title');
  }
  addText(canAssignedText, svg, width / 2, getCanAssignedLabelY(height, fontSize), fontSize / 3, 'quota-canAssigned-text')
  // addLegend(svg, width, data)
}

function addTooltip() {
  let tooltip = select('#percent-quota-tooltip');

  if (tooltip.empty()) {
    tooltip = select('body').append('div')
      .attr('class', 'hover-label')
      .attr('id', 'percent-quota-tooltip')
      .attr('class', 'percent-quota-tooltip')
      .style('display', 'none');
  }

  return tooltip;
}

function addArcDistribution(svg, width, margin, thickness, distributionPercent, tooltip, tooltipHtml, el, isProject) {
  const maxPath = addArc(svg, width, margin, thickness, 'gauge-max-path', 100);

  bindingEvents(maxPath, el, tooltip, tooltipHtml, isProject)

  if (distributionPercent) {
    const valuePath = addArc(svg, width, margin, thickness, 'gauge-quota-distribution-fill', distributionPercent > 100 ? 100 : distributionPercent);

    bindingEvents(valuePath, el, tooltip, tooltipHtml, isProject)
  }
}

function addArcUsage(svg, width, margin, thickness, usedPercent, tooltip, tooltipHtml, el, isProject) {
  const valuePath = addArc(svg, width, margin, thickness, 'gauge-quota-usage-fill', usedPercent > 100 ? 100 : usedPercent);

  bindingEvents(valuePath, el, tooltip, tooltipHtml, isProject)

  return { valuePath };
}

function getTitleLabelY(height, fontSize) {
  return height / 5 + 1.7 * fontSize;
}

function getCanAssignedLabelY(height, fontSize) {
  return height / 5 + 4.0 * fontSize;
}

function getTotalLabelY(height, fontSize) {
  return height / 5 + 2.4 * fontSize;
}

export function addText(text, svg, x, y, fontSize, mode, bold = 0) {
  return svg.append('svg:text')
    .attr('x', x)
    .attr('y', y)
    .attr('dy', fontSize / 2)
    .attr('text-anchor', 'middle')
    .text(text)
    .attr('class', `gauge-${ mode }-fill`)
    .style('font-size', `${ fontSize  }px`)
    .style('stroke-width', `${ bold }px`);
}

export function addArc(svg, width, margin, thickness, gaugeColor, value, start = 0, strokeWidth = 1) {
  value = value || 0;
  const r = calcR(width, margin);

  return svg.append('path')
    .attr('d', createArc(-135, value, r, thickness, start))
    .style('stroke-width', strokeWidth)
    .attr('class', `gauge-text-stroke ${ gaugeColor }`)
    .attr('cursor', 'pointer')
    .attr('transform', `translate(${  margin + r
    },${  margin + r + 10 }), scale(1, 1)`);
}

export function createArc(sa, ea, r, thickness, start = 0) {
  ea = 2.7 * parseInt(ea, 10) - 135;
  sa = 2.7 * parseInt(start, 10) - 135;

  return svg.arc()
    .outerRadius(r)
    .innerRadius(r - thickness)
    .startAngle(d2r(sa))
    .endAngle(d2r(ea))
    .cornerRadius(thickness / 2)
}

export function d2r(d) {
  return d * (Math.PI / 180);
}

export function sin(value) {
  return Math.sin((45 - (2.7 * value)) * Math.PI / 180);
}

export function cos(value) {
  return Math.cos((45 - (2.7 * value)) * Math.PI / 180);
}

export function calcR(width, margin) {
  return (width - 2 * margin) / 2;
}

export function valueToPoint(width, height, margin, value, thickness) {
  const r = calcR(width, margin) - (thickness / 2);

  return {
    x: width - r * cos(value) - r - margin - (thickness / 2),
    y: height - r - margin + r * sin(value) - (thickness / 2),
  };
}

export function getWidth(el) {
  const width = el.parentNode.offsetWidth * 0.9;

  return width > 0 ? width : 0;
}

export function getConfig(options) {
  const width = getWidth(options.el);

  return {
    el:        options.el,
    fontSize:  width / 7,
    margin:    width / 20,
    width,
    height:    width,
    thickness: width / 20,
  };
}

export function getRange(ticks) {
  let max;
  let min;

  (ticks || []).map((tick) => {
    if (tick.value !== 0 && !tick.value) {
      return {}
    }
    const value = parseInt(tick.value, 10);

    max = (max === undefined || value > max) ? value : max;
    min = (min === undefined || value < min) ? value : min;
  });

  return {
    max,
    min,
  }
}

function getPosition(el) {
  if (el.node()) {
    var elPos = el.node().getBoundingClientRect();

    return {
      top:    elPos.top,
      left:   elPos.left,
      width:  elPos.width,
      bottom: elPos.bottom,
      height: elPos.height,
      right:  elPos.right,
    }
  }

  return null
}

function bindingEvents(el, parentEl, tooltip, tooltipHtml, isProject) {
  el.on('mouseover', () => {
    let position = getPosition(select(parentEl))
    let height = isProject ? 100 : 80

    if (position) {
      el.style('stroke-width', 5);
      tooltip.transition()
        .style('display', 'block');
      tooltip.html(tooltipHtml)
        .style('left', `${ (position.left) - 35 }px`)
        .style('top', `${ (position.top) - height }px`);
    }
  }).on('mouseout', () => {
    el.style('stroke-width', 1);
    tooltip.transition()
      .style('display', 'none');
  });
}
