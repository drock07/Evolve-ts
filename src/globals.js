import jQuery from 'jquery';
window.$ = window.jQuery = jQuery;

import Vue from 'vue';
window.Vue = Vue;

import Buefy from 'buefy';
import 'buefy/dist/buefy.css';
Vue.use(Buefy);

import { createPopper } from '@popperjs/core';
window.Popper = { createPopper };

import Sortable from 'sortablejs';
window.Sortable = Sortable;

import Chart from 'chart.js/auto';
window.Chart = Chart;

import LZString from 'lz-string';
window.LZString = LZString;
