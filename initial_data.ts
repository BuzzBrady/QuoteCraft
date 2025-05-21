interface MaterialOption {
  materialOptionId: string;
  name: string;
  materialId: string;
}

interface Material {
  materialId: string;
  name: string;
  materialOptions: string[];
}

interface Task {
  taskId: string;
  name: string;
  categoryId: string;
  materials: string[];
  pricingMethod: 'fixed' | 'meter_rate' | 'lump_sum';
  fixed_price?: number;
  meter_rate?: number
}

interface Category {
  categoryId: string;
  name: string;
  areaId: string;
  tasks: string[];
}

interface Area {
  areaId: string;
  name: string;
  categories: string[];
}

const materialOptions: MaterialOption[] = [
  { materialOptionId: 'option-1', name: 'Freestanding', materialId: 'material-1' },
  { materialOptionId: 'option-2', name: 'Spa', materialId: 'material-1' },
  { materialOptionId: 'option-3', name: 'Standard', materialId: 'material-1' },
  { materialOptionId: 'option-4', name: 'Ceramic', materialId: 'material-2' },
  { materialOptionId: 'option-5', name: 'Porcelain', materialId: 'material-2' },
  { materialOptionId: 'option-6', name: 'Stone', materialId: 'material-2' },
  { materialOptionId: 'option-7', name: 'LED', materialId: 'material-3' },
  { materialOptionId: 'option-8', name: 'Halogen', materialId: 'material-3' },
  { materialOptionId: 'option-9', name: 'Fluorescent', materialId: 'material-3' },
    { materialOptionId: 'option-10', name: 'Timber', materialId: 'material-4' },
  { materialOptionId: 'option-11', name: 'Carpet', materialId: 'material-4' },
  { materialOptionId: 'option-12', name: 'Tile', materialId: 'material-4' },
    { materialOptionId: 'option-13', name: 'Laminate', materialId: 'material-5' },
  { materialOptionId: 'option-14', name: 'Hardwood', materialId: 'material-5' },
  { materialOptionId: 'option-15', name: 'Vinyl', materialId: 'material-5' },
    { materialOptionId: 'option-16', name: 'Basic', materialId: 'material-6' },
  { materialOptionId: 'option-17', name: 'Premium', materialId: 'material-6' },
  { materialOptionId: 'option-18', name: 'Deluxe', materialId: 'material-6' },
    { materialOptionId: 'option-19', name: 'Standard', materialId: 'material-7' },
  { materialOptionId: 'option-20', name: 'Wall-Hung', materialId: 'material-7' },
  { materialOptionId: 'option-21', name: 'Smart', materialId: 'material-7' },
    { materialOptionId: 'option-22', name: 'Standard', materialId: 'material-8' },
  { materialOptionId: 'option-23', name: 'Flush', materialId: 'material-8' },
  { materialOptionId: 'option-24', name: 'Inset', materialId: 'material-8' },
    { materialOptionId: 'option-25', name: 'Stone', materialId: 'material-9' },
  { materialOptionId: 'option-26', name: 'Painted', materialId: 'material-9' },
  { materialOptionId: 'option-27', name: 'Papered', materialId: 'material-9' },
];

const materials: Material[] = [
  { materialId: 'material-1', name: 'Bath', materialOptions: ['option-1', 'option-2', 'option-3'] },
  { materialId: 'material-2', name: 'Tile', materialOptions: ['option-4', 'option-5', 'option-6'] },
  { materialId: 'material-3', name: 'Lighting', materialOptions: ['option-7', 'option-8', 'option-9'] },
  { materialId: 'material-4', name: 'Floorboards', materialOptions: ['option-10'] },
  { materialId: 'material-5', name: 'Floor', materialOptions: ['option-13', 'option-14', 'option-15'] },
   { materialId: 'material-6', name: 'Cabinetry', materialOptions: ['option-16', 'option-17', 'option-18'] },
  { materialId: 'material-7', name: 'Toilet', materialOptions: ['option-19', 'option-20', 'option-21'] },
  { materialId: 'material-8', name: 'Sink', materialOptions: ['option-22', 'option-23', 'option-24'] },
  { materialId: 'material-9', name: 'Wall', materialOptions: ['option-25', 'option-26', 'option-27'] },

];

const tasks: Task[] = [
  { taskId: 'task-1', name: 'Supply and Install', categoryId: 'category-1', materials: ['material-1', 'material-2'], pricingMethod: 'fixed', fixed_price: 500 },
  { taskId: 'task-2', name: 'Install', categoryId: 'category-1', materials: ['material-1','material-2'], pricingMethod: 'fixed', fixed_price: 300 },
  { taskId: 'task-3', name: 'Remove and Dispose', categoryId: 'category-1', materials: ['material-1', 'material-2'], pricingMethod: 'fixed', fixed_price: 100 },
  { taskId: 'task-4', name: 'Supply and Install', categoryId: 'category-2', materials: ['material-3'], pricingMethod: 'fixed', fixed_price: 200 },
   { taskId: 'task-5', name: 'Install', categoryId: 'category-2', materials: ['material-3'], pricingMethod: 'fixed', fixed_price: 100 },
  { taskId: 'task-6', name: 'Remove and Prepare for Reinstatement', categoryId: 'category-2', materials: ['material-3'], pricingMethod: 'fixed', fixed_price: 50 },
  { taskId: 'task-7', name: 'Supply and Install', categoryId: 'category-3', materials: ['material-4'], pricingMethod: 'meter_rate', meter_rate: 100},
  { taskId: 'task-8', name: 'Install', categoryId: 'category-3', materials: ['material-4'], pricingMethod: 'meter_rate', meter_rate: 50},
  { taskId: 'task-9', name: 'Lay Floor Protection', categoryId: 'category-3', materials: ['material-4'], pricingMethod: 'fixed', fixed_price: 150 },
   { taskId: 'task-10', name: 'Supply and Install', categoryId: 'category-4', materials: ['material-5'], pricingMethod: 'fixed', fixed_price: 500 },
    { taskId: 'task-11', name: 'Install', categoryId: 'category-4', materials: ['material-5'], pricingMethod: 'fixed', fixed_price: 300 },
  { taskId: 'task-12', name: 'Remove and Dispose', categoryId: 'category-4', materials: ['material-5'], pricingMethod: 'fixed', fixed_price: 100 },
  { taskId: 'task-13', name: 'Supply and Install', categoryId: 'category-5', materials: ['material-6'], pricingMethod: 'fixed', fixed_price: 200 },
  { taskId: 'task-14', name: 'Install', categoryId: 'category-5', materials: ['material-6'], pricingMethod: 'fixed', fixed_price: 100 },
  { taskId: 'task-15', name: 'Remove and Prepare for Reinstatement', categoryId: 'category-5', materials: ['material-6'], pricingMethod: 'fixed', fixed_price: 50 },
   { taskId: 'task-16', name: 'Supply and Install', categoryId: 'category-6', materials: ['material-7'], pricingMethod: 'fixed', fixed_price: 200 },
  { taskId: 'task-17', name: 'Install', categoryId: 'category-6', materials: ['material-7'], pricingMethod: 'meter_rate', meter_rate: 50},
  { taskId: 'task-18', name: 'Lay Floor Protection', categoryId: 'category-6', materials: ['material-7'], pricingMethod: 'fixed', fixed_price: 150 },
  { taskId: 'task-19', name: 'Supply and Install', categoryId: 'category-7', materials: ['material-8'], pricingMethod: 'fixed', fixed_price: 500 },
  { taskId: 'task-20', name: 'Install', categoryId: 'category-7', materials: ['material-8'], pricingMethod: 'fixed', fixed_price: 300 },
  { taskId: 'task-21', name: 'Remove and Dispose', categoryId: 'category-7', materials: ['material-8'], pricingMethod: 'fixed', fixed_price: 100 },
  { taskId: 'task-22', name: 'Supply and Install', categoryId: 'category-8', materials: ['material-9'], pricingMethod: 'fixed', fixed_price: 200 },
  { taskId: 'task-23', name: 'Install', categoryId: 'category-8', materials: ['material-9'], pricingMethod: 'fixed', fixed_price: 100 },
  { taskId: 'task-24', name: 'Remove and Prepare for Reinstatement', categoryId: 'category-8', materials: ['material-9'], pricingMethod: 'fixed', fixed_price: 50 },
   { taskId: 'task-25', name: 'Supply and Install', categoryId: 'category-9', materials: ['material-9'], pricingMethod: 'meter_rate', meter_rate: 100},
  { taskId: 'task-26', name: 'Install', categoryId: 'category-9', materials: ['material-9'], pricingMethod: 'meter_rate', meter_rate: 50},
  { taskId: 'task-27', name: 'Lay Floor Protection', categoryId: 'category-9', materials: ['material-9'], pricingMethod: 'fixed', fixed_price: 150 },
];

const categories: Category[] = [
  { categoryId: 'category-1', name: 'Plumbing', areaId: 'area-1', tasks: ['task-1', 'task-2', 'task-3'] },
  { categoryId: 'category-2', name: 'Electrical', areaId: 'area-1', tasks: ['task-4', 'task-5', 'task-6'] },
  { categoryId: 'category-3', name: 'Flooring', areaId: 'area-1', tasks: ['task-7', 'task-8', 'task-9'] },
  { categoryId: 'category-4', name: 'Flooring', areaId: 'area-2', tasks: ['task-10', 'task-11', 'task-12'] },
  { categoryId: 'category-5', name: 'Cabinetry', areaId: 'area-2', tasks: ['task-13', 'task-14', 'task-15'] },
  { categoryId: 'category-6', name: 'Toilet', areaId: 'area-2', tasks: ['task-16', 'task-17', 'task-18'] },
  { categoryId: 'category-7', name: 'Sink', areaId: 'area-3', tasks: ['task-19', 'task-20', 'task-21'] },
  { categoryId: 'category-8', name: 'Wall', areaId: 'area-3', tasks: ['task-22', 'task-23', 'task-24'] },
  { categoryId: 'category-9', name: 'Provisional Allowances', areaId: 'area-3', tasks: ['task-25', 'task-26', 'task-27'] },
];

const areas: Area[] = [
  { areaId: 'area-1', name: 'Bathroom', categories: ['category-1', 'category-2', 'category-3'] },
  { areaId: 'area-2', name: 'Kitchen', categories: ['category-4', 'category-5', 'category-6'] },
  { areaId: 'area-3', name: 'Living Room', categories: ['category-7', 'category-8', 'category-9'] },
];

export const initialData = {
  areas,
  categories,
  tasks,
  materials,
  materialOptions,
};