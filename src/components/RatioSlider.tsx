/**
 * A 0-100 split between two outputs, with a slider and a stepper either side.
 *
 * Four panels share this exactly — the titan mine, the smoldering quarry, the
 * mining ship (three of them) and the alien space station — differing only in
 * their labels and which field of a record they write. Extracted because
 * those six instances are evidence, not because a second panel looked similar.
 *
 * It replaces Buefy's <b-slider> with a native range input, which brings
 * keyboard support and screen-reader semantics that the Buefy one needed
 * markup to approximate.
 */

export interface RatioSliderData {
    /** What the split is between, as a sentence. */
    description: string;
    /** Current value, 0-100. */
    value: number;
    /** Which way each stepper moves production. */
    subLabel: string;
    addLabel: string;
    /** Accessible name for the slider itself. */
    sliderLabel: string;
    /** Extra classes on the bar — the stacked panels use `thin`. */
    barClass?: string;
}

export interface RatioSliderCallbacks {
    onSub: () => void;
    onAdd: () => void;
    /** Dragging the slider sets a value outright rather than stepping. */
    onSet: (value: number) => void;
}

export function RatioSlider({ data, callbacks }: {
    data: RatioSliderData;
    callbacks: RatioSliderCallbacks;
}) {
    return (
        <>
            <div>{data.description}</div>
            <div className={`sliderbar${data.barClass ? ` ${data.barClass}` : ''}`}>
                <span className="sub" role="button" aria-label={data.subLabel} onClick={callbacks.onSub}>
                    &laquo;
                </span>
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={data.value}
                    aria-label={data.sliderLabel}
                    aria-valuetext={`${data.value}%`}
                    onChange={event => callbacks.onSet(Number(event.target.value))}
                />
                <span className="add" role="button" aria-label={data.addLabel} onClick={callbacks.onAdd}>
                    &raquo;
                </span>
            </div>
        </>
    );
}
