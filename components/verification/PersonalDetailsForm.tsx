"use client";

import React from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface PersonalDetailsFormProps {
  initialFullName: string;
  initialDob: string;
  onSubmit: (data: { fullName: string; dob: string }) => void;
  onBack: () => void;
}

export const PersonalDetailsForm: React.FC<PersonalDetailsFormProps> = ({
  initialFullName,
  initialDob,
  onSubmit,
  onBack,
}) => {
  const [fullName, setFullName] = React.useState(initialFullName);
  const [dob, setDob] = React.useState(initialDob);
  const [errors, setErrors] = React.useState<{ fullName?: string; dob?: string }>({});

  const validate = () => {
    const tempErrors: typeof errors = {};
    let isValid = true;

    if (!fullName.trim()) {
      tempErrors.fullName = "Full name is required.";
      isValid = false;
    }

    if (!dob) {
      tempErrors.dob = "Date of birth is required.";
      isValid = false;
    } else {
      const birthDate = new Date(dob);
      const today = new Date();
      
      if (isNaN(birthDate.getTime())) {
        tempErrors.dob = "Invalid date of birth format.";
        isValid = false;
      } else if (birthDate > today) {
        tempErrors.dob = "Date of birth cannot be in the future.";
        isValid = false;
      } else {
        // Calculate age
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        if (age < 18) {
          tempErrors.dob = "You must be at least 18 years old to verify.";
          isValid = false;
        } else if (age > 120) {
          tempErrors.dob = "Please enter a valid date of birth (max age is 120).";
          isValid = false;
        }
      }
    }

    setErrors(tempErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ fullName, dob });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-2">
      {/* Form Fields */}
      <div className="flex flex-col gap-4">
        {/* Full Name Input */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="fullName"
            className="text-xs font-semibold text-secondary"
          >
            Full Name
          </label>
          <Input
            id="fullName"
            type="text"
            placeholder="e.g. John Doe"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
            }}
            error={!!errors.fullName}
            required
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
          />
          {errors.fullName && (
            <span
              id="fullName-error"
              className="text-[11px] text-error font-medium"
              aria-live="polite"
            >
              {errors.fullName}
            </span>
          )}
        </div>

        {/* Date of Birth Input */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="dob"
            className="text-xs font-semibold text-secondary"
          >
            Date of Birth
          </label>
          <Input
            id="dob"
            type="date"
            placeholder="YYYY-MM-DD"
            value={dob}
            onChange={(e) => {
              setDob(e.target.value);
              if (errors.dob) setErrors((prev) => ({ ...prev, dob: undefined }));
            }}
            error={!!errors.dob}
            required
            aria-describedby={errors.dob ? "dob-error" : undefined}
          />
          {errors.dob && (
            <span
              id="dob-error"
              className="text-[11px] text-error font-medium"
              aria-live="polite"
            >
              {errors.dob}
            </span>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3 mt-4 border-t border-outline-variant/20 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          className="px-6 h-11"
        >
          Back
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="px-6 h-11 min-w-[120px]"
        >
          Continue
        </Button>
      </div>
    </form>
  );
};

export default PersonalDetailsForm;
