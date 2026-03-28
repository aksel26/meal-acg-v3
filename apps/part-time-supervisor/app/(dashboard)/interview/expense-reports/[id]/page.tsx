import { ExpenseReportDetailPage } from "@/components/interview/ExpenseReportDetailPage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <ExpenseReportDetailPage id={id} />;
}
