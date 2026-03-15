import { global, breakdown } from './vars';
import { deepClone, adjustCosts, messageQueue } from './functions';
import { races, traits } from './races';
import { craftCost, tradeRatio, atomic_mass, tradeBuyPrice, tradeSellPrice } from './resources';
import { actions, checkAffordable } from './actions';
import { fuel_adjust, int_fuel_adjust } from './space';
import { shipCosts } from './truepath';
import { f_rate } from './industry';
import { armyRating } from './civics';
import { alevel } from './achieve';
import { loc } from './locale';

export function enableDebug(){
    if (global.settings.expose){
        window.evolve = {
            actions: deepClone(actions),
            races: deepClone(races),
            traits: deepClone(traits),
            tradeRatio: deepClone(tradeRatio),
            craftCost: deepClone(craftCost(true)),
            atomic_mass: deepClone(atomic_mass),
            f_rate: deepClone(f_rate),
            checkAffordable: deepClone(checkAffordable),
            adjustCosts: deepClone(adjustCosts),
            armyRating: deepClone(armyRating),
            tradeBuyPrice: deepClone(tradeBuyPrice),
            tradeSellPrice: deepClone(tradeSellPrice),
            fuel_adjust: deepClone(fuel_adjust),
            int_fuel_adjust: deepClone(int_fuel_adjust),
            alevel: deepClone(alevel),
            messageQueue: deepClone(messageQueue),
            loc: deepClone(loc),
            shipCosts: deepClone(shipCosts),
            updateDebugData: deepClone(updateDebugData),
            global: {},
            breakdown: {},
        };
    }
}

export function updateDebugData(){
    if (global.settings.expose){
        window.evolve.global = deepClone(global);
        window.evolve.craftCost = deepClone(craftCost(true)),
        window.evolve.breakdown = deepClone(breakdown);
    }
}
