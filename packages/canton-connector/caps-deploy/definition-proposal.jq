{
  dataId: $dataId,
  operator: $operator,
  auditors: [],
  readers: ([$viewer] + ($readers | split(" ") | map(select(length > 0)))),
  verifier: $verifier,
  publishers: [],
  accepted: []
}
