/**
 * Custom field renderer registry.
 *
 * Maps a (DocType, fieldname) pair to a custom Vue component that replaces
 * the default field renderer in DocTypeFormView.
 *
 * Each entry is `{ component, props? }`. The component receives:
 *   - modelValue: current field value (v-model compatible)
 *   - formData:   the entire form's reactive data (lets a renderer react
 *                 to other fields, e.g. SmartFieldDropdown reading
 *                 source_doctype)
 *   - field:      the DocType field meta
 *   - ...props:   any extra static props from `props` are spread in
 */
import IconPickerField from './IconPickerField.vue'
import ColorPresetField from './ColorPresetField.vue'
import SmartFieldDropdown from './SmartFieldDropdown.vue'
import CoreDocTypePicker from './CoreDocTypePicker.vue'
import FilterBuilder from './FilterBuilder.vue'

export const FIELD_RENDERERS = {
  'Dashboard Widget': {
    icon: { component: IconPickerField },
    color_preset: { component: ColorPresetField },
    source_doctype: { component: CoreDocTypePicker },
    metric_field: { component: SmartFieldDropdown, props: { filterType: 'numeric' } },
    date_field: { component: SmartFieldDropdown, props: { filterType: 'date' } },
    group_by_field: { component: SmartFieldDropdown, props: { filterType: 'grouping' } },
    filters_json: { component: FilterBuilder },
  },
}

export function resolveFieldRenderer(doctype, fieldname) {
  return FIELD_RENDERERS[doctype]?.[fieldname] || null
}
