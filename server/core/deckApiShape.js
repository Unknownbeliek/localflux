'use strict';

function resolveDeckSlides(data) {
  if (Array.isArray(data?.slides)) return data.slides;
  if (Array.isArray(data?.questions)) return data.questions;
  return null;
}

function buildDeckSummary(file, data) {
  const slides = resolveDeckSlides(data) || [];
  return {
    name: file.replace('.json', ''),
    file,
    count: slides.length,
  };
}

function buildDeckDetail(file, data) {
  const slides = resolveDeckSlides(data);
  if (!Array.isArray(slides)) return null;

  return {
    name: file.replace('.json', ''),
    file,
    count: slides.length,
    slides,
    // Backward-compatible key for older clients.
    questions: slides,
  };
}

module.exports = {
  resolveDeckSlides,
  buildDeckSummary,
  buildDeckDetail,
};
