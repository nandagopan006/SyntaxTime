import Section from "../ui/Section";

/*
  The frame around each supporting dashboard section.

  The focus timer and the Today panel are cards, because they are what the user
  comes to Home for. Everything below them shares the lighter shared Section
  treatment, so the page has an obvious order instead of a grid of identical
  boxes - and so Home, Friends and Profile all use the same one.
*/
function DashboardSection({ title, action, children }) {
  return (
    <Section title={title} action={action}>
      {children}
    </Section>
  );
}

export default DashboardSection;
