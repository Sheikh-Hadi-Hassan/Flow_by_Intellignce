#!/usr/bin/env bash
set -euo pipefail

source_id="${1:-}"
target_root="${2:-experiments/blm/reference-sources}"

if [[ -z "${source_id}" ]]; then
  echo "usage: $0 <allowlisted-source-id> [target-root]" >&2
  exit 2
fi

case "${source_id}" in
  moqui.mantle-udm)
    repo_url="https://github.com/moqui/mantle-udm.git"
    expected_ref="f53aba96a14fc97c6b42918300ee880fa0eb03a1"
    ;;
  moqui.mantle-usl)
    repo_url="https://github.com/moqui/mantle-usl.git"
    expected_ref="6b6ce35e7a000b5e476d51f91413bc98d7f75f89"
    ;;
  semanticarts.gist)
    repo_url="https://github.com/semanticarts/gist.git"
    expected_ref="c73068bfe779db2643b1e43c920cc8039b15a013"
    ;;
  edmcouncil.fibo)
    repo_url="https://github.com/edmcouncil/fibo.git"
    expected_ref="119fa8c091aa4beece7d22aefa6fe138021a4355"
    ;;
  oagi.score)
    repo_url="https://github.com/OAGi/Score.git"
    expected_ref="08afc22ba71794e5860e06132a0996982f61d490"
    ;;
  apache.ofbiz-framework)
    repo_url="https://github.com/apache/ofbiz-framework.git"
    expected_ref="90c5ae72dfef79cae62adbf06e3d65ef1af31ea1"
    ;;
  *)
    echo "source is not allowlisted: ${source_id}" >&2
    exit 1
    ;;
esac

mkdir -p "${target_root}"
target_dir="${target_root}/${source_id}"

if [[ -e "${target_dir}" ]]; then
  echo "target already exists: ${target_dir}" >&2
  exit 1
fi

git clone --filter=blob:none --no-checkout "${repo_url}" "${target_dir}"
git -C "${target_dir}" checkout --detach "${expected_ref}"
git -C "${target_dir}" rev-parse HEAD > "${target_dir}/FLOW_REFERENCE_COMMIT.txt"

echo "checked out ${source_id} at $(cat "${target_dir}/FLOW_REFERENCE_COMMIT.txt")"
echo "no upstream code was executed; this directory is ignored by git"
