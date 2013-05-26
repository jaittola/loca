#!/bin/bash -eux

FLK_SOURCEFILES="flaska flk.wsgi"

if [ -z "$FLK_DEPLOY_DIR" ] ; then
    echo "FLK_DEPLOY_DIR not set. Cannot continue."
    exit 1
fi

if [ -z "$FLK_SRC_DIR" ] ; then
    echo "FLK_SRC_DIR not set. Cannot continue."
    exit 1
fi

if [ -d "${FLK_DEPLOY_DIR}/flaska-new" ] ||
   [ -d "${FLK_DEPLOY_DIR}/flaska-prev" ] ; then
   echo "The previous deployment seems to have been incomplete."
   echo "Please clean up the situation manually."
   exit 2
fi

# Create a copy of the previous deployment.
if [ -d "${FLK_DEPLOY_DIR}/flaska" ] ; then
   backup_name="${FLK_DEPLOY_DIR}/flaska-old-`date +%Y-%m-%d-%H.%M.%S`.tar.gz"
   (cd "$FLK_DEPLOY_DIR" && tar zcf "$backup_name" flaska)
fi

# Create a new copy from sources
mkdir -p "${FLK_DEPLOY_DIR}/flaska-new"
cd "${FLK_DEPLOY_DIR}/flaska-new"
(cd "${FLK_SRC_DIR}/flaska" && tar cf - ${FLK_SOURCEFILES}) | tar xf -

# Set up the local-settings directory
(cd ../flaska && tar cf - local-settings) | tar xf -

# Replace the old deployment with the new one.
cd ..
mv flaska flaska-prev
mv flaska-new flaska

# Restart apache
/etc/init.d/apache2 reload

# If everything is successful, clean up.
if [ $? -eq 0 ] ; then
    echo "Success."
    rm -rf flaska-prev
    exit 0
fi

echo "Restarting apache failed. Please check. Bailing out."
exit 2

