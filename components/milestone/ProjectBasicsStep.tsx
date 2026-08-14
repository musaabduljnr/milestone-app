import React from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

export interface ProjectBasicsData {
  title: string;
  description: string;
  category: string;
  expectedCompletion: string;
}

export interface ProjectBasicsStepProps {
  data: ProjectBasicsData;
  onChange: (fields: Partial<ProjectBasicsData>) => void;
  onNext: () => void;
}

export const ProjectBasicsStep: React.FC<ProjectBasicsStepProps> = ({
  data,
  onChange,
  onNext,
}) => {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!data.title.trim()) newErrors.title = "Project title is required";
    if (!data.category.trim()) newErrors.category = "Category is required";
    if (!data.expectedCompletion.trim()) newErrors.expectedCompletion = "Target completion date is required";
    if (!data.description.trim()) newErrors.description = "Project description is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleNext} className="flex flex-col gap-6">
      <div>
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
          Project Basics
        </h2>
        <p className="font-body-sm text-body-sm text-muted-foreground mt-1">
          Give your project a clear title and details description.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
            Project Title
          </label>
          <Input
            id="title"
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="e.g. Mobile App Redesign"
            error={!!errors.title}
          />
          {errors.title && <span className="text-xs text-error font-medium">{errors.title}</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="category" className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
              Project Category
            </label>
            <Select
              id="category"
              value={data.category}
              onChange={(e) => onChange({ category: e.target.value })}
              error={!!errors.category}
            >
              <option value="">Choose category...</option>
              <option value="Mobile Development">Mobile Development</option>
              <option value="Web Development">Web Development</option>
              <option value="UI/UX Design">UI/UX Design</option>
              <option value="Database Architecture">Database Architecture</option>
            </Select>
            {errors.category && <span className="text-xs text-error font-medium">{errors.category}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="expectedCompletion" className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
              Expected Completion Date
            </label>
            <Input
              id="expectedCompletion"
              type="date"
              value={data.expectedCompletion}
              onChange={(e) => onChange({ expectedCompletion: e.target.value })}
              error={!!errors.expectedCompletion}
            />
            {errors.expectedCompletion && (
              <span className="text-xs text-error font-medium">{errors.expectedCompletion}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
            Detailed Description
          </label>
          <Textarea
            id="description"
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Outline project objectives, tech stack parameters, and required deliverables..."
            error={!!errors.description}
            rows={5}
          />
          {errors.description && <span className="text-xs text-error font-medium">{errors.description}</span>}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/30">
        <Button type="submit" variant="primary">
          Continue to Budget
        </Button>
      </div>
    </form>
  );
};
