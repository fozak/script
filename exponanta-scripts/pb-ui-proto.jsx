// DocPageComponent.tsx (or .jsx if using JS)

<DocPage doctype="currentDoctype" name={currentName} data={pb.getDoc(currentDoctype, currentName)}>
  
  
  <DocForm>
    
    <DocFields data={data} />

    <DocChildTable data={pb.listChildren(childDoctype, currentName)} parentName={currentName} />

  </DocForm>
</DocPage>
