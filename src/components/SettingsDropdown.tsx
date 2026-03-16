/**
 * SettingsDropdown — reusable select for settings panel.
 *
 * Wraps Headless UI Select for accessible, styled dropdowns.
 */

import { Field, Label, Select } from '@headlessui/react';

export interface DropdownOption {
    value: string;
    label: string;
}

export interface SettingsDropdownProps {
    label: string;
    value: string;
    options: DropdownOption[];
    onChange: (value: string) => void;
}

export function SettingsDropdown({ label, value, options, onChange }: SettingsDropdownProps) {
    return (
        <Field as="span" style={{ display: 'inline-block', marginRight: '0.5rem' }}>
            <Label>{label} </Label>
            <Select
                className="button is-primary"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </Select>
        </Field>
    );
}
