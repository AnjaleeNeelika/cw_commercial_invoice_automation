import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FolderPlus, Loader2, Lock, Pencil, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";

const humanizeKey = (key: string) =>
    key
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/^./, (value) => value.toUpperCase());

const parseData = (data: unknown): unknown => {
    if (typeof data !== "string") return data;

    try {
        return JSON.parse(data);
    } catch {
        return data;
    }
};

const normalizeData = (data: unknown): unknown => {
    let normalized = parseData(data);

    if (typeof normalized === "string") {
        const parsed = parseData(normalized);
        if (parsed !== normalized) return normalizeData(parsed);
    }

    if (Array.isArray(normalized) && normalized.length === 1) {
        normalized = normalized[0];
    }

    if (normalized && typeof normalized === "object" && !Array.isArray(normalized)) {
        const record = normalized as Record<string, unknown>;
        const wrapperKey = ["data", "output", "json"].find(
            (key) => key in record,
        );

        if (wrapperKey) {
            return normalizeData(record[wrapperKey]);
        }
    }

    return normalized;
};

type DataGroup = {
    label: string;
    fields: Array<[string, unknown]>;
};

const documentIsSpreadsheet = (name: string) => /\.(xls|xlsx|csv)$/i.test(name);

const getGroupKey = (record: Record<string, unknown>, isSpreadsheet: boolean) => {
    const keys = isSpreadsheet
        ? ["sheetName", "sheet_name", "sheet"]
        : ["pageNumber", "page_number", "page"];
    const key = keys.find((candidate) => candidate in record);
    return key ? { key, value: record[key] } : null;
};

const getGroups = (data: unknown, documentName: string): DataGroup[] => {
    const isSpreadsheet = documentIsSpreadsheet(documentName);

    if (data && typeof data === "object" && !Array.isArray(data)) {
        const record = data as Record<string, unknown>;
        const groupedKey = isSpreadsheet ? "sheets" : "pages";

        if (groupedKey in record) {
            return getGroups(record[groupedKey], documentName);
        }

        const keyedGroups = Object.entries(record).filter(
            ([, value]) => value && typeof value === "object",
        );

        if (keyedGroups.length > 0 && keyedGroups.length === Object.keys(record).length) {
            return keyedGroups.map(([label, value]) => ({
                label: isSpreadsheet ? `Sheet: ${label}` : `Page: ${label}`,
                fields: getFields(value),
            }));
        }

        return [{ label: isSpreadsheet ? "Sheet 1" : "Page 1", fields: getFields(record) }];
    }

    if (Array.isArray(data)) {
        const groups = new Map<string, Array<[string, unknown]>>();

        data.forEach((item, index) => {
            if (item && typeof item === "object" && !Array.isArray(item)) {
                const record = item as Record<string, unknown>;
                const groupKey = getGroupKey(record, isSpreadsheet);
                const label = groupKey
                    ? `${isSpreadsheet ? "Sheet" : "Page"}: ${groupKey.value}`
                    : `${isSpreadsheet ? "Sheet" : "Page"} ${index + 1}`;
                const fields = Object.entries(record).filter(
                    ([key]) => !groupKey || key !== groupKey.key,
                );
                groups.set(label, [...(groups.get(label) ?? []), ...fields]);
            } else {
                const label = `${isSpreadsheet ? "Sheet" : "Page"} ${index + 1}`;
                groups.set(label, [["Value", item]]);
            }
        });

        return Array.from(groups, ([label, fields]) => ({ label, fields }));
    }

    return [];
};

const getFields = (data: unknown): Array<[string, unknown]> => {
    if (data && typeof data === "object" && !Array.isArray(data)) {
        return Object.entries(data as Record<string, unknown>);
    }

    return [["Value", data]];
};

function NestedFields({
    value,
    path,
    isEditing,
    isConfirmed,
    canEdit,
    onChange,
}: {
    value: unknown;
    path: string;
    isEditing: boolean;
    isConfirmed: boolean;
    canEdit: boolean;
    onChange: (path: string, value: string) => void;
}) {
    if (Array.isArray(value)) {
        return (
            <div className="space-y-3 border-l-2 border-muted pl-3">
                {value.map((item, index) => (
                    <div key={`${path}-${index}`} className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                            Item {index + 1}
                        </p>
                        <NestedFields
                            value={item}
                            path={`${path}.${index}`}
                            isEditing={isEditing}
                            isConfirmed={isConfirmed}
                            canEdit={canEdit}
                            onChange={onChange}
                        />
                    </div>
                ))}
            </div>
        );
    }

    if (value && typeof value === "object") {
        return (
            <div className="space-y-3 border-l-2 border-muted pl-3">
                {Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => {
                    const nestedPath = `${path}.${key}`;
                    const isSimpleValue =
                        nestedValue === null || typeof nestedValue !== "object";

                    return (
                        <div key={nestedPath} className="space-y-2">
                            <Label htmlFor={nestedPath}>{humanizeKey(key)}</Label>
                            {isSimpleValue ? (
                                <Input
                                    id={nestedPath}
                                    value={String(nestedValue ?? "")}
                                    readOnly={!isEditing || !canEdit || isConfirmed}
                                    onChange={(event) => onChange(nestedPath, event.target.value)}
                                />
                            ) : (
                                <NestedFields
                                    value={nestedValue}
                                    path={nestedPath}
                                    isEditing={isEditing}
                                    isConfirmed={isConfirmed}
                                    canEdit={canEdit}
                                    onChange={onChange}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <Input
            id={path}
            value={String(value ?? "")}
            readOnly={!isEditing || !canEdit || isConfirmed}
            onChange={(event) => onChange(path, event.target.value)}
        />
    );
}

export default function ExtractedDataForm({
    data,
    documentName,
    isConfirmed = false,
    isConfirming = false,
    isExtracting = false,
    onConfirm,
    onReExtract,
}: {
    data: unknown;
    documentName: string;
    isConfirmed?: boolean;
    isConfirming?: boolean;
    isExtracting?: boolean;
    onConfirm?: (data: unknown) => void;
    onReExtract?: () => void;
}) {
    const [draftData, setDraftData] = useState<unknown>(() => normalizeData(data));
    const [isEditing, setIsEditing] = useState(false);
    const [newFieldLabel, setNewFieldLabel] = useState("");
    const [newFieldValue, setNewFieldValue] = useState("");
    const [newSectionLabel, setNewSectionLabel] = useState("");
    const [newSectionField, setNewSectionField] = useState("");
    const [newSectionValue, setNewSectionValue] = useState("");

    const parsedData = normalizeData(draftData);
    const groups = getGroups(parsedData, documentName);
    const canEdit = Boolean(
        parsedData && typeof parsedData === "object" && !Array.isArray(parsedData),
    );

    const updateField = (path: string, value: string) => {
        if (!canEdit) return;
        setDraftData((currentData: unknown) => {
            const nextData = structuredClone(currentData);
            const pathParts = path.split(".");
            let target = nextData as Record<string, unknown> | unknown[];

            pathParts.slice(0, -1).forEach((part) => {
                target = (target as Record<string, unknown>)[part] as
                    | Record<string, unknown>
                    | unknown[];
            });

            (target as Record<string, unknown>)[pathParts[pathParts.length - 1]] = value;
            return nextData;
        });
    };

    const addField = () => {
        const label = newFieldLabel.trim();
        if (!label || !canEdit) return;

        setDraftData((currentData: unknown) => ({
            ...(currentData as Record<string, unknown>),
            [label]: newFieldValue,
        }));
        setNewFieldLabel("");
        setNewFieldValue("");
    };

    const addSection = () => {
        const sectionLabel = newSectionLabel.trim();
        const fieldLabel = newSectionField.trim();
        if (!sectionLabel || !fieldLabel || !canEdit) return;

        setDraftData((currentData: unknown) => ({
            ...(currentData as Record<string, unknown>),
            [sectionLabel]: { [fieldLabel]: newSectionValue },
        }));
        setNewSectionLabel("");
        setNewSectionField("");
        setNewSectionValue("");
    };

    if (groups.length === 0) {
        return (
            <Textarea
                value={JSON.stringify(parsedData, null, 2) ?? String(parsedData)}
                readOnly
                className="min-h-72 flex-1 font-mono text-xs"
                aria-label="Extracted data"
            />
        );
    }

    return (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {groups.map((group) => (
                <section key={group.label} className="space-y-3 rounded-lg border p-3">
                    <h3 className="text-sm font-semibold">{group.label}</h3>
                    {group.fields.map(([key, value]) => {
                        const isSimpleValue = value === null || typeof value !== "object";
                        const displayValue: string = isSimpleValue
                            ? String(value ?? "")
                            : JSON.stringify(value, null, 2) ?? "";

                        return (
                            <div key={`${group.label}-${key}`} className="space-y-2">
                                <Label htmlFor={`${group.label}-${key}`}>{humanizeKey(key)}</Label>
                                {isSimpleValue ? (
                                    <Input
                                        id={`${group.label}-${key}`}
                                        value={displayValue}
                                        readOnly={!isEditing || !canEdit || isConfirmed}
                                        onChange={(event) => updateField(key, event.target.value)}
                                    />
                                ) : (
                                    <NestedFields
                                        value={value}
                                        path={`${group.label}.${key}`}
                                        isEditing={isEditing}
                                        isConfirmed={isConfirmed}
                                        canEdit={canEdit}
                                        onChange={updateField}
                                    />
                                )}
                            </div>
                        );
                    })}
                </section>
            ))}
            {isEditing && canEdit && !isConfirmed && (
                <div className="space-y-4 rounded-lg border border-dashed p-3">
                    <p className="text-sm font-semibold">Add field</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="new-field-label">Field name</Label>
                            <Input
                                id="new-field-label"
                                value={newFieldLabel}
                                placeholder="e.g. payment_terms"
                                onChange={(event) => setNewFieldLabel(event.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-field-value">Value</Label>
                            <Input
                                id="new-field-value"
                                value={newFieldValue}
                                placeholder="Enter a value"
                                onChange={(event) => setNewFieldValue(event.target.value)}
                            />
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={addField}
                        disabled={!newFieldLabel.trim()}
                    >
                        <Plus />
                        Add field
                    </Button>
                    <div className="border-t pt-4">
                        <p className="mb-3 text-sm font-semibold">Add section</p>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="new-section-label">Section name</Label>
                                <Input
                                    id="new-section-label"
                                    value={newSectionLabel}
                                    placeholder="e.g. Shipping"
                                    onChange={(event) => setNewSectionLabel(event.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-section-field">First field</Label>
                                <Input
                                    id="new-section-field"
                                    value={newSectionField}
                                    placeholder="e.g. carrier"
                                    onChange={(event) => setNewSectionField(event.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-section-value">Value</Label>
                                <Input
                                    id="new-section-value"
                                    value={newSectionValue}
                                    placeholder="Enter a value"
                                    onChange={(event) => setNewSectionValue(event.target.value)}
                                />
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="mt-3"
                            onClick={addSection}
                            disabled={!newSectionLabel.trim() || !newSectionField.trim()}
                        >
                            <FolderPlus />
                            Add section
                        </Button>
                    </div>
                </div>
            )}
            {(onConfirm || onReExtract) && (
                <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                    {!isConfirmed && canEdit && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditing((editing) => !editing)}
                        >
                            <Pencil />
                            {isEditing ? "Done editing" : "Edit"}
                        </Button>
                    )}
                    {!isConfirmed && onConfirm && (
                        <Button
                            type="button"
                            onClick={() => onConfirm(parsedData)}
                            disabled={isConfirming || !canEdit}
                        >
                            {isConfirming ? <Loader2 className="animate-spin" /> : <Lock />}
                            {isConfirming ? "Confirming..." : "Confirm data"}
                        </Button>
                    )}
                    {onReExtract && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onReExtract}
                            disabled={isExtracting || isConfirmed}
                        >
                            <RefreshCw className={isExtracting ? "animate-spin" : undefined} />
                            Re-extract
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}