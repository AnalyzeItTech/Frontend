export function PageTitle({ title, accent }: { title: string; accent?: string }) {
  return (
    <h1 className="page-title">
      {title}
      {accent ? (
        <>
          {' '}
          <em>{accent}</em>
        </>
      ) : null}
    </h1>
  );
}
