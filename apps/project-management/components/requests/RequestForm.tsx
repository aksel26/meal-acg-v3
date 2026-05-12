"use client";

import { Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { RequestPriority, RequestRecord } from "@/lib/requests";

type MasterMember = {
  id: string;
  full_name: string;
  role: string | null;
  member_role: string | null;
  team_id: string | null;
};

type MasterTeam = {
  id: string;
  name: string;
};

type MasterClient = {
  id: string;
  name: string;
  parent_company: string | null;
};

type MasterRequestType = {
  id: string;
  name: string;
  defaultTeamName: string;
  defaultPriority: string;
};

type ProjectOption = {
  id: string;
  title: string;
  customer_names: string[];
  status: string;
};

interface RequestFormProps {
  onSuccess?: (id: string) => void;
  initialDueDate?: string;
  initialAssignees?: { id: string; fullName: string }[];
  initialRequest?: RequestRecord;
  hideSubmitRow?: boolean;
  submitLabel?: string;
}

export function RequestForm({
  onSuccess,
  initialDueDate,
  initialAssignees = [],
  initialRequest,
  hideSubmitRow,
  submitLabel,
}: RequestFormProps = {}) {
  const router = useRouter();
  const isEditMode = Boolean(initialRequest);
  const [title, setTitle] = useState(initialRequest?.title ?? "");
  const [body, setBody] = useState(initialRequest?.body ?? "");
  const [priority, setPriority] = useState<RequestPriority>(
    initialRequest?.priority ?? "P3",
  );
  const [requestType, setRequestType] = useState(initialRequest?.request_type ?? "");
  const [projectId, setProjectId] = useState("");
  const [customerNames, setCustomerNames] = useState<string[]>(
    initialRequest?.customer_names ?? [],
  );
  const [customerOtherEnabled, setCustomerOtherEnabled] = useState(false);
  const [customerOtherInput, setCustomerOtherInput] = useState("");
  const [affiliateNames, setAffiliateNames] = useState<string[]>(
    initialRequest?.affiliate_names ?? [],
  );
  const [affiliateOtherEnabled, setAffiliateOtherEnabled] = useState(false);
  const [affiliateOtherInput, setAffiliateOtherInput] = useState("");
  const [teamNames, setTeamNames] = useState<string[]>(initialRequest?.team_names ?? []);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    initialRequest?.assignee_ids ?? initialAssignees.map((assignee) => assignee.id),
  );
  const [assigneeNames, setAssigneeNames] = useState<string[]>(
    initialRequest?.assignee_names ??
      initialAssignees.map((assignee) => assignee.fullName),
  );
  const [dueDate, setDueDate] = useState(initialRequest?.due_date ?? initialDueDate ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [members, setMembers] = useState<MasterMember[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [teams, setTeams] = useState<MasterTeam[]>([]);
  const [clients, setClients] = useState<MasterClient[]>([]);
  const [customerGroups, setCustomerGroups] = useState<string[]>([]);
  const [requestTypes, setRequestTypes] = useState<MasterRequestType[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/masters")
      .then((response) => response.json())
      .then((payload) => {
        setMembers(payload.members ?? []);
        setTeams(payload.teams ?? []);
        setClients(payload.clients ?? []);
        setCustomerGroups(payload.customerGroups ?? []);
        setRequestTypes(payload.requestTypes ?? []);
      })
      .catch(() => setError("마스터 데이터를 불러오지 못했습니다."));

    fetch("/api/projects")
      .then((response) => response.json())
      .then((payload) => setProjects(Array.isArray(payload) ? payload : []))
      .catch(() => setProjects([]));
  }, []);

  const selectedRequestType = useMemo(
    () => requestTypes.find((type) => type.id === requestType),
    [requestType, requestTypes],
  );

  const filteredMembers = useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase();
    if (!keyword) return members;

    return members.filter((member) =>
      [member.full_name, member.member_role, member.role]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [memberSearch, members]);

  const affiliateOptions = useMemo(() => {
    if (customerNames.length === 0) return clients;

    return clients.filter((client) =>
      customerNames.includes(client.parent_company || client.name),
    );
  }, [clients, customerNames]);

  useEffect(() => {
    if (customerNames.length === 0) return;

    const optionNames = new Set(affiliateOptions.map((client) => client.name));
    setAffiliateNames((current) => current.filter((name) => optionNames.has(name)));
  }, [affiliateOptions, customerNames.length]);

  function handleRequestTypeChange(value: string) {
    setRequestType(value);
    const nextType = requestTypes.find((type) => type.id === value);
    if (nextType?.defaultPriority) {
      setPriority(nextType.defaultPriority as RequestPriority);
    }
    if (nextType?.defaultTeamName) {
      setTeamNames((current) =>
        current.includes(nextType.defaultTeamName)
          ? current
          : [...current, nextType.defaultTeamName],
      );
    }
  }

  function toggleTeam(name: string) {
    setTeamNames((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  }

  function toggleCustomer(name: string) {
    setCustomerNames((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  }

  function toggleAffiliate(name: string) {
    setAffiliateNames((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  }

  function clearCustomers() {
    setCustomerNames([]);
    setCustomerOtherEnabled(false);
    setCustomerOtherInput("");
    setAffiliateNames([]);
    setAffiliateOtherEnabled(false);
    setAffiliateOtherInput("");
  }

  function clearAffiliates() {
    setAffiliateNames([]);
    setAffiliateOtherEnabled(false);
    setAffiliateOtherInput("");
  }

  function toggleAssignee(member: MasterMember) {
    setAssigneeIds((current) =>
      current.includes(member.id)
        ? current.filter((id) => id !== member.id)
        : [...current, member.id],
    );
    setAssigneeNames((current) =>
      current.includes(member.full_name)
        ? current.filter((name) => name !== member.full_name)
        : [...current, member.full_name],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const manualCustomerName = customerOtherInput.trim();
      const nextCustomerNames =
        customerOtherEnabled && manualCustomerName
          ? [...customerNames, manualCustomerName]
          : customerNames;
      const manualAffiliateName = affiliateOtherInput.trim();
      const nextAffiliateNames =
        affiliateOtherEnabled && manualAffiliateName
          ? [...affiliateNames, manualAffiliateName]
          : affiliateNames;

      const response = await fetch(
        initialRequest ? `/api/requests/${initialRequest.id}` : "/api/requests",
        {
          method: initialRequest ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title,
            body,
            priority,
            requestType,
            ...(initialRequest ? {} : { projectId: projectId || null }),
            customerNames: [...new Set(nextCustomerNames)],
            affiliateNames: [...new Set(nextAffiliateNames)],
            teamNames,
            assigneeIds,
            assigneeNames,
            dueDate: dueDate || null,
          }),
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "요청 생성에 실패했습니다.");
      }

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadResponse = await fetch(`/api/requests/${payload.id}/attachments`, {
          method: "POST",
          body: formData,
        });
        if (!uploadResponse.ok) {
          const uploadPayload = await uploadResponse.json();
          throw new Error(uploadPayload.error || `${file.name} 업로드에 실패했습니다.`);
        }
      }

      if (onSuccess) {
        onSuccess(payload.id);
        router.refresh();
      } else if (initialRequest) {
        router.refresh();
      } else {
        router.push(`/requests/${payload.id}`);
        router.refresh();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "요청 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "h-10 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-[#111111]";
  const hasCustomerSelection =
    customerNames.length > 0 || customerOtherEnabled || Boolean(customerOtherInput.trim());
  const hasAffiliateSelection =
    affiliateNames.length > 0 || affiliateOtherEnabled || Boolean(affiliateOtherInput.trim());
  const priorityOptions: { value: RequestPriority; label: string }[] = [
    { value: "P1", label: "P1 - 긴급" },
    { value: "P2", label: "P2 - 보통" },
    { value: "P3", label: "P3 - 낮음" },
  ];

  return (
    <form id="request-form" className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600" htmlFor="title">
              제목
            </label>
            <input
              id="title"
              className={`mt-1.5 ${inputClass}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: SK 결과레포트 출력 요청"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600" htmlFor="body">
              요청 내용
            </label>
            <textarea
              id="body"
              className="mt-1.5 min-h-28 w-full resize-y rounded-md border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm leading-6 text-slate-700 outline-none transition-colors focus:border-[#111111]"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="필요한 작업, 배경, 참고 링크를 적어주세요."
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600" htmlFor="dueDate">
              마감일
            </label>
            <input
              id="dueDate"
              type="date"
              className={`mt-1.5 ${inputClass}`}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>

          {!isEditMode && (
            <div>
              <label className="text-xs font-medium text-slate-600" htmlFor="projectId">
                연결 프로젝트
              </label>
              <select
                id="projectId"
                className={`mt-1.5 ${inputClass}`}
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
              >
                <option value="">선택 안 함</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                    {project.customer_names?.length
                      ? ` · ${project.customer_names.join(", ")}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-600" htmlFor="requestType">
              요청 유형
            </label>
            <select
              id="requestType"
              className={`mt-1.5 ${inputClass}`}
              value={requestType}
              onChange={(event) => handleRequestTypeChange(event.target.value)}
            >
              <option value="">선택 안 함</option>
              {requestTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {selectedRequestType?.defaultTeamName && (
              <p className="mt-1 text-[11px] text-slate-400">
                기본 담당팀: {selectedRequestType.defaultTeamName}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">
              우선순위
            </label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value)}
                  className={`h-10 rounded-md border text-sm font-medium transition-colors ${
                    priority === option.value
                      ? "border-[#111111] bg-[#111111] text-white"
                      : "border-[#e5e7eb] bg-white text-slate-700 hover:border-[#111111]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">
              담당팀
            </label>
            <div className="mt-1.5 max-h-32 overflow-y-auto rounded-md border border-[#e5e7eb] bg-white p-2">
              {teams.map((team) => (
                <label
                  key={team.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-[#f9f9fa]"
                >
                  <input
                    checked={teamNames.includes(team.name)}
                    className="size-4"
                    type="checkbox"
                    onChange={() => toggleTeam(team.name)}
                  />
                  <span className="truncate">{team.name}</span>
                </label>
              ))}
              {teams.length === 0 && (
                <p className="px-2 py-1.5 text-sm text-slate-400">팀 데이터가 없습니다.</p>
              )}
            </div>
            {teamNames.length > 0 && (
              <p className="mt-1 text-[11px] text-slate-400">
                선택됨: {teamNames.join(", ")}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">
              담당자
            </label>
            <input
              className={`mt-1.5 ${inputClass}`}
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder="담당자 검색"
            />
            <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-[#e5e7eb] bg-white p-2">
              {filteredMembers.map((member) => (
                <label
                  key={member.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-[#f9f9fa]"
                >
                  <input
                    checked={assigneeIds.includes(member.id)}
                    className="size-4"
                    type="checkbox"
                    onChange={() => toggleAssignee(member)}
                  />
                  <span className="truncate">
                    {member.full_name} {member.member_role ? `(${member.member_role})` : ""}
                  </span>
                </label>
              ))}
              {filteredMembers.length === 0 && (
                <p className="px-2 py-1.5 text-sm text-slate-400">
                  {members.length === 0 ? "직원 데이터가 없습니다." : "검색 결과가 없습니다."}
                </p>
              )}
            </div>
            {assigneeNames.length > 0 && (
              <p className="mt-1 text-[11px] text-slate-400">
                선택됨: {assigneeNames.join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-medium text-slate-600">
              고객사
            </label>
            {hasCustomerSelection && (
              <button
                type="button"
                className="text-xs font-medium text-slate-400 transition-colors hover:text-[#111111]"
                onClick={clearCustomers}
              >
                전체해제
              </button>
            )}
          </div>
          <div className="mt-1.5 max-h-36 overflow-y-auto rounded-md border border-[#e5e7eb] bg-white p-2">
            {customerGroups.map((customerName) => (
              <label
                key={customerName}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-[#f9f9fa]"
              >
                <input
                  checked={customerNames.includes(customerName)}
                  className="size-4"
                  type="checkbox"
                  onChange={() => toggleCustomer(customerName)}
                />
                <span className="truncate">{customerName}</span>
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-[#f9f9fa]">
              <input
                checked={customerOtherEnabled}
                className="size-4"
                type="checkbox"
                onChange={(event) => setCustomerOtherEnabled(event.target.checked)}
              />
              <span>기타</span>
            </label>
            {customerGroups.length === 0 && (
              <p className="px-2 py-1.5 text-sm text-slate-400">고객사 데이터가 없습니다.</p>
            )}
          </div>
          {customerOtherEnabled && (
            <input
              className={`mt-2 ${inputClass}`}
              value={customerOtherInput}
              onChange={(event) => setCustomerOtherInput(event.target.value)}
              placeholder="고객사명을 입력하세요"
            />
          )}
          {(customerNames.length > 0 || (customerOtherEnabled && customerOtherInput.trim())) && (
            <p className="mt-1 text-[11px] text-slate-400">
              선택됨: {[...customerNames, customerOtherInput.trim()].filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-medium text-slate-600">
              계열사
            </label>
            {hasAffiliateSelection && (
              <button
                type="button"
                className="text-xs font-medium text-slate-400 transition-colors hover:text-[#111111]"
                onClick={clearAffiliates}
              >
                전체해제
              </button>
            )}
          </div>
          {customerNames.length === 0 ? (
            <div className="mt-1.5 flex h-36 items-center justify-center rounded-md border border-dashed border-[#e5e7eb] bg-[#fafafa] px-4 text-center text-sm text-slate-400">
              고객사를 선택하면 계열사 목록이 표시됩니다.
            </div>
          ) : (
            <>
              <div className="mt-1.5 max-h-36 overflow-y-auto rounded-md border border-[#e5e7eb] bg-white p-2">
                {affiliateOptions.map((client) => (
                  <label
                    key={client.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-[#f9f9fa]"
                  >
                    <input
                      checked={affiliateNames.includes(client.name)}
                      className="size-4"
                      type="checkbox"
                      onChange={() => toggleAffiliate(client.name)}
                    />
                    <span className="truncate">{client.name}</span>
                  </label>
                ))}
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-[#f9f9fa]">
                  <input
                    checked={affiliateOtherEnabled}
                    className="size-4"
                    type="checkbox"
                    onChange={(event) => setAffiliateOtherEnabled(event.target.checked)}
                  />
                  <span>기타</span>
                </label>
                {affiliateOptions.length === 0 && (
                  <p className="px-2 py-1.5 text-sm text-slate-400">계열사 데이터가 없습니다.</p>
                )}
              </div>
              {affiliateOtherEnabled && (
                <input
                  className={`mt-2 ${inputClass}`}
                  value={affiliateOtherInput}
                  onChange={(event) => setAffiliateOtherInput(event.target.value)}
                  placeholder="계열사명을 입력하세요"
                />
              )}
              {(affiliateNames.length > 0 || (affiliateOtherEnabled && affiliateOtherInput.trim())) && (
                <p className="mt-1 text-[11px] text-slate-400">
                  선택됨: {[...affiliateNames, affiliateOtherInput.trim()].filter(Boolean).join(", ")}
                </p>
              )}
            </>
          )}
        </div>

          <div>
            <label className="text-xs font-medium text-slate-600" htmlFor="files">
              첨부파일
            </label>
            <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#d4d8de] px-4 py-5 text-center transition-colors hover:bg-[#f9f9fa]">
              <Upload className="size-4 text-slate-400" />
              <span className="mt-1.5 text-xs text-slate-600">파일 선택</span>
              <span className="mt-0.5 text-[11px] text-slate-400">파일당 20MB 이하</span>
              <input
                id="files"
                className="sr-only"
                type="file"
                multiple
                onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              />
            </label>
            {files.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {files.map((file) => (
                  <div
                    key={`${file.name}-${file.size}`}
                    className="flex items-center justify-between rounded-md bg-[#f9f9fa] px-3 py-2 text-xs"
                  >
                    <span className="truncate text-slate-700">{file.name}</span>
                    <button
                      className="text-slate-400 hover:text-slate-600"
                      type="button"
                      onClick={() => setFiles((current) => current.filter((item) => item !== file))}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!hideSubmitRow && (
        <div className="flex justify-end pt-2">
          <button
            className="h-10 rounded-md bg-[#111111] px-4 text-sm font-medium text-white transition-colors hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "저장 중" : submitLabel ?? (isEditMode ? "요청 수정" : "요청 등록")}
          </button>
        </div>
      )}
    </form>
  );
}
